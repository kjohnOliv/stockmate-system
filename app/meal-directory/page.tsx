"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, PlusCircle, Search, Trash, X } from 'lucide-react';
import { resolveEffectiveRole, useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label";
import MealDetails from "@/components/dashboard/MealDetails";
import RoleGuard from '../../components/auth/RoleGuard';
import { ApiClient, isAccessDeniedError } from "@/lib/api";
import { AlertNotice, FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { AppCombobox } from "@/components/ui/app-combobox";
import { normalizeTitleCase } from "@/lib/meal-planning";

interface InventoryItem {
  id: number;
  item: string;
  unit: string;
  price: number;
}

interface Ingredient {
  inventoryId: number | null;
  itemName?: string;
  qty: number;
  unit: string;
  avgPrice?: number;
}

interface Meal {
  id?: number | null;
  name: string;
  category: string;
  paxSize: number;
  pax_size?: number;
  allergens: string;
  price: number;
  ingredients: Ingredient[];
}

const PAGE_SIZE = 5;

function normalizeUppercase(value: string) {
  return value.toUpperCase().trim();
}

function getMealEstimatedCostPerServing(
  meal: Meal,
  inventoryById: Map<number, InventoryItem>
) {
  const totalCost = (meal.ingredients ?? []).reduce((sum, ingredient) => {
    const matchedInventory = inventoryById.get(ingredient.inventoryId ?? -1);
    const unitPrice = Number(matchedInventory?.price ?? ingredient.avgPrice ?? 0);
    return sum + unitPrice * Number(ingredient.qty || 0);
  }, 0);

  const pax = Number(meal.paxSize || meal.pax_size || 0);
  return {
    totalCost,
    costPerServing: pax > 0 ? totalCost / pax : 0,
  };
}

export default function MealDirectory() {
  const { user } = useAuth();
  const effectiveRole = resolveEffectiveRole(user);
  const isCook = effectiveRole === "cook";
  const canEdit = isCook;
  const [meals, setMeals] = useState<Meal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Meal | null>(null);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);

  const initialForm: Meal = {
    name: '',
    category: 'Breakfast',
    paxSize: 50,
    allergens: '',
    price: 0,
    ingredients: [{ inventoryId: null, qty: 0, unit: '' }]
  };

  const [formData, setFormData] = useState<Meal>(initialForm);

  const fetchInventory = async () => {
    try {
      const res = await ApiClient.get("/api/inventory");
      const result = await res.json();
      const list = result?.success ? result.data : result?.data ?? result;
      setInventory(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Inventory fetch failed", err);
      setInventory([]);
    }
  };

  const fetchMeals = async () => {
    try {
      setIsLoadingMeals(true);
      const res = await ApiClient.get("/api/recipes");
      const result = await res.json();
      const list = result?.success ? result.data : result?.data ?? result;
      setMeals(Array.isArray(list) ? list : []);
    } catch (err) {
      if (isAccessDeniedError(err)) {
        try {
          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
          const fallbackRes = await fetch(`${baseUrl}/recipes/`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });

          if (!fallbackRes.ok) {
            setMeals([]);
            return;
          }

          const fallbackResult = await fallbackRes.json();
          const fallbackList = fallbackResult?.success ? fallbackResult.data : fallbackResult?.data ?? fallbackResult;
          setMeals(Array.isArray(fallbackList) ? fallbackList : []);
          return;
        } catch {
          setMeals([]);
          return;
        }
      }

      console.error("Recipes fetch failed", err);
      setMeals([]);
    } finally {
      setIsLoadingMeals(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchInventory();
      fetchMeals();
    });
  }, []);

  const filteredMeals = useMemo(() => {
    let result = [...meals];
    if (categoryFilter !== "All") result = result.filter((meal) => meal.category === categoryFilter);
    if (searchQuery) result = result.filter((meal) => meal.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [categoryFilter, meals, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMeals.length / PAGE_SIZE));
  const currentItems = filteredMeals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const inventoryById = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory]);
  const recipeEstimatedCost = useMemo(
    () =>
      formData.ingredients.reduce((sum, ingredient) => {
        const unitPrice = Number(inventoryById.get(ingredient.inventoryId ?? -1)?.price ?? 0);
        return sum + unitPrice * Number(ingredient.qty || 0);
      }, 0),
    [formData.ingredients, inventoryById]
  );
  const recipeEstimatedCostPerServing = useMemo(() => {
    const pax = Number(formData.paxSize || 0);
    if (pax <= 0) return 0;
    return recipeEstimatedCost / pax;
  }, [formData.paxSize, recipeEstimatedCost]);
  const currentItemsWithCosting = useMemo(
    () =>
      currentItems.map((meal) => {
        const costing = getMealEstimatedCostPerServing(meal, inventoryById);
        const sellingPrice = Number(meal.price ?? 0);
        return {
          meal,
          ...costing,
          isBelowCost: sellingPrice > 0 && costing.costPerServing > sellingPrice,
        };
      }),
    [currentItems, inventoryById]
  );
  const ingredientOptions = useMemo(
    () => inventory.map((item) => ({ label: item.item, value: String(item.id) })),
    [inventory]
  );

  const handleIngredientSelect = (idx: number, invId: string) => {
    const updated = [...formData.ingredients];
    if (invId === "") {
      updated[idx] = { inventoryId: null, qty: 0, unit: '' };
    } else {
      const selectedItem = inventory.find((item) => item.id === parseInt(invId, 10));
      if (selectedItem) {
        updated[idx] = {
          ...updated[idx],
          inventoryId: selectedItem.id,
          unit: selectedItem.unit,
          itemName: selectedItem.item,
        };
      }
    }
    setFormData({ ...formData, ingredients: updated });
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validIngredients = formData.ingredients
      .filter((ingredient) => ingredient.inventoryId !== null)
      .map((ingredient) => {
        const source = inventoryById.get(ingredient.inventoryId ?? -1);
        return {
          ...ingredient,
          itemName: ingredient.itemName || source?.item || "",
          unit: ingredient.unit || source?.unit || "",
          avgPrice: Number(source?.price ?? 0),
        };
      });
    if (validIngredients.length === 0) {
      setError("Please add at least one valid ingredient.");
      return;
    }

    if (/rice meal/i.test(formData.name)) {
      const hasRiceIngredient = validIngredients.some((ingredient) => {
        const itemName = ingredient.itemName || inventoryById.get(ingredient.inventoryId ?? -1)?.item || "";
        return /\b(rice|bigas)\b/i.test(itemName);
      });

      if (!hasRiceIngredient) {
        setError('Rice meals must include a rice or bigas ingredient for accurate costing.');
        return;
      }
    }

    if (Number(formData.paxSize || 0) <= 0) {
      setError("Serving size must be greater than zero.");
      return;
    }

    if (Number(formData.price || 0) < recipeEstimatedCostPerServing) {
      setError(
        `Price per serving must be at least PHP ${recipeEstimatedCostPerServing.toFixed(2)} to avoid negative profit.`
      );
      return;
    }

    const payload = {
      ...formData,
      name: normalizeTitleCase(formData.name),
      allergens: normalizeUppercase(formData.allergens),
      price: Number(formData.price || 0),
      ingredients: validIngredients,
      paxSize: Number(formData.paxSize),
      pax_size: Number(formData.paxSize),
    };

    try {
      if (formData.id) {
        await ApiClient.put(`/api/recipes/${formData.id}`, payload);
      } else {
        await ApiClient.post("/api/recipes", payload);
      }

      setIsModalOpen(false);
      setFormData(initialForm);
      fetchMeals();
    } catch (err) {
      console.error("Save meal failed", err);
      setError("Failed to save meal recipe.");
    }
  };

  const handleDeleteMeal = async () => {
    if (!deleteTarget?.id) return;
    try {
      await ApiClient.delete(`/api/recipes/${deleteTarget.id}`);
      fetchMeals();
      setViewingMeal(null);
      setDeleteTarget(null);
    } catch {
      setError("Error deleting recipe.");
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-full bg-[#f4f5ef] px-3 py-3 text-slate-800 md:px-4 md:py-4 lg:px-5">
        <div className="mx-auto max-w-7xl">
          <header className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[2.1rem] font-black tracking-tight text-slate-900 md:text-[2.1rem]">Meal Directory</h1>
              <p className="mt-1 text-[13px] font-medium text-[#2f6f4f] md:text-[0.9rem]">
                {isCook ? "Standardized recipes and serving-size management." : "View standardized recipes and serving sizes."}
              </p>
            </div>
          </header>

          <div className="mb-3 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full rounded-xl border border-emerald-100 bg-white py-2.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500"
                placeholder="Search by meal name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <AppSelect
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
              className="min-w-[180px] px-4 py-2.5 text-sm font-semibold"
              options={[
                { label: "All Categories", value: "All" },
                { label: "Breakfast", value: "Breakfast" },
                { label: "Lunch", value: "Lunch" },
                { label: "Snack", value: "Snack" },
              ]}
            />
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setError("");
                  setFormData(initialForm);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f6f4f] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#285f44]"
              >
                <Plus size={18} strokeWidth={3} /> Add Meal
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(47,111,79,0.08)]">
            <div className="hidden-scrollbar overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6f4f]">
                  <tr>
                    <th className="px-4 py-3">Meal #</th>
                    <th className="px-4 py-3">Meal Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Serving Size</th>
                    <th className="px-4 py-3">Price / Serving</th>
                    <th className="px-4 py-3">Ingredients</th>
                    <th className="px-4 py-3">Allergens</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoadingMeals ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center font-bold text-slate-400">Loading recipes...</td>
                    </tr>
                  ) : currentItemsWithCosting.length > 0 ? (
                    currentItemsWithCosting.map(({ meal, costPerServing, isBelowCost }, index) => (
                      <tr
                        key={meal.id || index}
                        onClick={() => setViewingMeal(meal)}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-400">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="px-4 py-3 text-[0.95rem] font-black text-slate-900">{normalizeTitleCase(meal.name)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600">{normalizeTitleCase(meal.category)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{meal.paxSize || meal.pax_size} Pax</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-800">PHP {Number(meal.price ?? 0).toFixed(2)}</span>
                            <span className="text-[11px] font-bold text-slate-400">
                              Cost/serving: PHP {costPerServing.toFixed(2)}
                            </span>
                            {isBelowCost ? (
                              <span className="inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-600">
                                Below Cost
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{meal.ingredients?.length || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600">{meal.allergens ? normalizeTitleCase(meal.allergens.replaceAll(",", ", ")) : "None"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center font-bold text-slate-400">No recipes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + (currentItems.length ? 1 : 0)}-{(currentPage - 1) * PAGE_SIZE + currentItems.length} of {filteredMeals.length}
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="min-w-[74px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-400 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  Prev
                </button>
                <div className="flex min-w-16 items-center justify-center px-2 text-sm font-black text-[#2f6f4f]">{currentPage} / {totalPages}</div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="min-w-[74px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
                <div className="table-header-emerald border-b border-emerald-100 px-7 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">
                        {formData.id ? "Edit Meal Recipe" : "Add New Meal Recipe"}
                      </h2>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-700 transition hover:bg-white/70">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveMeal} className="max-h-[75vh] overflow-y-auto px-8 py-7">
                  {error && <div className="mb-5"><AlertNotice message={error} variant="error" /></div>}

                  <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
                    <div className="space-y-5">
                      <h3 className="text-2xl font-black tracking-tight text-slate-900">Meal Details</h3>
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Meal Name</Label>
                        <input
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-bold text-slate-800 outline-none transition-colors focus:border-emerald-500"
                          placeholder="Adobong Manok Rice Meal"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          onBlur={(e) => setFormData({ ...formData, name: normalizeTitleCase(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Category</Label>
                        <AppSelect
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          className="mt-2 w-full px-4 py-4 font-black text-slate-800"
                          options={[
                            { label: "Breakfast", value: "Breakfast" },
                            { label: "Lunch", value: "Lunch" },
                            { label: "Snack", value: "Snack" },
                          ]}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Serving Size (Pax)</Label>
                        <input
                          type="number"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-black text-slate-800 outline-none focus:border-emerald-500"
                          value={formData.paxSize}
                          onChange={(e) => setFormData({ ...formData, paxSize: parseInt(e.target.value, 10) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Allergens</Label>
                        <input
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-black uppercase text-slate-800 outline-none focus:border-emerald-500"
                          placeholder="SOY, NUTS"
                          value={formData.allergens}
                          onChange={(e) => setFormData({ ...formData, allergens: normalizeUppercase(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Price Per Serving</Label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-black text-slate-800 outline-none focus:border-emerald-500"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black tracking-tight text-slate-900">Ingredients</h3>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, ingredients: [...formData.ingredients, { inventoryId: null, qty: 0, unit: '' }] })}
                          className="flex items-center gap-1 text-sm font-black text-[#2f6f4f]"
                        >
                          <PlusCircle size={16} /> Add Row
                        </button>
                      </div>

                      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
                        {formData.ingredients.map((ingredient, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <AppCombobox
                                  value={String(ingredient.inventoryId || "")}
                                  onValueChange={(value) => handleIngredientSelect(idx, value)}
                                  className="w-full rounded-xl px-3 py-3 text-sm font-bold text-slate-700"
                                  placeholder="Select Item"
                                  searchPlaceholder="Search ingredient..."
                                  emptyMessage="No matching ingredient"
                                  options={ingredientOptions}
                                />
                              </div>
                              <div className="w-24">
                                <input
                                  type="number"
                                  step="any"
                                  required
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
                                  value={ingredient.qty}
                                  onChange={(e) => {
                                    const updated = [...formData.ingredients];
                                    updated[idx].qty = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, ingredients: updated });
                                  }}
                                />
                              </div>
                              <div className="w-10 pt-3 text-[10px] font-black uppercase text-slate-400">{ingredient.unit || '-'}</div>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, ingredients: formData.ingredients.filter((_, i) => i !== idx) })}
                                className="pt-2 text-red-500 transition hover:text-red-700"
                              >
                                <Trash size={18} />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2 text-sm font-black text-slate-600">
                              <span>=</span>
                              <div className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-slate-800">
                                PHP {(Number(inventoryById.get(ingredient.inventoryId ?? -1)?.price ?? 0) * Number(ingredient.qty || 0)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recipe Cost</p>
                        <p className="mt-1 text-2xl font-black text-[#2f6f4f]">PHP {recipeEstimatedCost.toFixed(2)}</p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Cost / Serving: PHP {recipeEstimatedCostPerServing.toFixed(2)}
                        </p>
                        {Number(formData.price || 0) > 0 && Number(formData.price || 0) < recipeEstimatedCostPerServing ? (
                          <p className="mt-2 text-xs font-black text-red-600">
                            Current selling price is below cost. Increase `Price Per Serving` to at least PHP {recipeEstimatedCostPerServing.toFixed(2)}.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-white pt-4">
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black uppercase text-red-700 transition hover:bg-red-100">
                        Cancel
                      </button>
                      <button type="submit" className="flex-1 rounded-2xl bg-[#2f6f4f] p-4 text-xs font-black uppercase text-white transition hover:bg-[#285f44]">
                        Save Recipe
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <MealDetails
            isOpen={!!viewingMeal}
            onClose={() => setViewingMeal(null)}
            recipe={viewingMeal}
            canManage={canEdit}
            onEdit={(meal) => {
              setViewingMeal(null);
              setError("");
              setFormData({
                ...meal,
                paxSize: meal.paxSize || meal.pax_size || 50,
                price: meal.price ?? 0,
              });
              setIsModalOpen(true);
            }}
            onDelete={(id) => {
              const meal = meals.find((entry) => entry.id === id);
              if (meal) setDeleteTarget(meal);
            }}
          />

          <FeedbackDialog
            open={Boolean(deleteTarget)}
            title="Delete Meal"
            message={deleteTarget ? `Delete ${normalizeTitleCase(deleteTarget.name)} permanently?` : ""}
            variant="warning"
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={handleDeleteMeal}
            onCancel={() => setDeleteTarget(null)}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
