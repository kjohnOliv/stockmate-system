"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, PlusCircle, Search, Trash, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label";
import MealDetails from "@/components/dashboard/MealDetails";
import RoleGuard from '../../components/auth/RoleGuard';
import { ApiClient } from "@/lib/api";
import { AlertNotice, FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";

interface InventoryItem {
  id: number;
  item: string;
  unit: string;
}

interface Ingredient {
  inventoryId: number | null;
  itemName?: string;
  qty: number;
  unit: string;
}

interface Meal {
  id?: number | null;
  name: string;
  category: string;
  paxSize: number;
  pax_size?: number;
  allergens: string;
  ingredients: Ingredient[];
}

const PAGE_SIZE = 10;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeUppercase(value: string) {
  return value.toUpperCase().trim();
}

export default function MealDirectory() {
  const { user } = useAuth();
  const isCook = user?.role?.toLowerCase() === "cook";
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

  const initialForm: Meal = {
    name: '',
    category: 'Breakfast',
    paxSize: 50,
    allergens: '',
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
      const res = await ApiClient.get("/api/recipes");
      const result = await res.json();
      const list = result?.success ? result.data : result?.data ?? result;
      setMeals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Recipes fetch failed", err);
      setMeals([]);
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

    const validIngredients = formData.ingredients.filter((ingredient) => ingredient.inventoryId !== null);
    if (validIngredients.length === 0) {
      setError("Please add at least one valid ingredient.");
      return;
    }

    const payload = {
      ...formData,
      name: normalizeUppercase(formData.name),
      allergens: normalizeUppercase(formData.allergens),
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
      <div className="min-h-screen bg-[#f4f5ef] p-6 text-slate-800 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">Meal Directory</h1>
              <p className="mt-2 text-sm font-medium text-[#2f6f4f]">
                {isCook ? "Standardized recipes and serving-size management." : "View standardized recipes and serving sizes."}
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setError("");
                  setFormData(initialForm);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6f4f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#285f44]"
              >
                <Plus size={18} strokeWidth={3} /> Add Meal
              </button>
            )}
          </header>

          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full rounded-2xl border border-emerald-100 bg-white py-4 pl-12 pr-4 text-base font-semibold outline-none transition focus:border-emerald-500"
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
              className="min-w-[180px] px-5 py-4 text-base font-semibold"
              options={[
                { label: "All Categories", value: "All" },
                { label: "Breakfast", value: "Breakfast" },
                { label: "Lunch", value: "Lunch" },
                { label: "Dinner", value: "Dinner" },
                { label: "Snack", value: "Snack" },
              ]}
            />
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(47,111,79,0.08)]">
            <div className="hidden-scrollbar overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="table-header-emerald border-b border-emerald-100 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f6f4f]">
                  <tr>
                    <th className="px-6 py-4">Meal #</th>
                    <th className="px-6 py-4">Meal Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Serving Size</th>
                    <th className="px-6 py-4">Ingredients</th>
                    <th className="px-6 py-4">Allergens</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {currentItems.length > 0 ? (
                    currentItems.map((meal, index) => (
                      <tr
                        key={meal.id || index}
                        onClick={() => setViewingMeal(meal)}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 last:border-b-0"
                      >
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-slate-400">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="px-6 py-5 text-[1.05rem] font-black text-slate-900">{titleCase(meal.name)}</td>
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-slate-600">{titleCase(meal.category)}</td>
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-slate-700">{meal.paxSize || meal.pax_size} Pax</td>
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-slate-700">{meal.ingredients?.length || 0}</td>
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-slate-600">{meal.allergens ? titleCase(meal.allergens.replaceAll(",", ", ")) : "None"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center font-bold text-slate-400">No recipes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-6">
              <p className="text-sm font-semibold text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + (currentItems.length ? 1 : 0)}-{(currentPage - 1) * PAGE_SIZE + currentItems.length} of {filteredMeals.length}
              </p>
              <div className="flex items-center gap-5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="min-w-[88px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-black text-slate-400 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  Prev
                </button>
                <div className="flex min-w-20 items-center justify-center px-2 text-base font-black text-[#2f6f4f]">{currentPage} / {totalPages}</div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="min-w-[88px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-2xl">
                <div className="table-header-emerald border-b border-emerald-100 px-7 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">
                        {formData.id ? "Edit Meal Recipe" : "Add New Meal Recipe"}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-slate-600">
                        Save meals in capital letters so the planner and food menu stay consistent.
                      </p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-700 transition hover:bg-white/70">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveMeal} className="max-h-[75vh] overflow-y-auto px-8 py-7">
                  {error && <div className="mb-5"><AlertNotice message={error} variant="error" /></div>}

                  <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Meal Name</Label>
                      <input
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-black uppercase text-slate-800 outline-none transition-colors focus:border-emerald-500"
                        placeholder="TINOLA"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: normalizeUppercase(e.target.value) })}
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
                          { label: "Dinner", value: "Dinner" },
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
                    <div className="col-span-1 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Allergens</Label>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-black uppercase text-slate-800 outline-none focus:border-emerald-500"
                        placeholder="SOY, NUTS"
                        value={formData.allergens}
                        onChange={(e) => setFormData({ ...formData, allergens: normalizeUppercase(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-2xl font-black tracking-tight text-slate-900">Ingredients</h3>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ingredients: [...formData.ingredients, { inventoryId: null, qty: 0, unit: '' }] })}
                        className="flex items-center gap-1 text-sm font-black text-[#2f6f4f]"
                      >
                        <PlusCircle size={16} /> Add Row
                      </button>
                    </div>
                    {formData.ingredients.map((ingredient, idx) => (
                      <div key={idx} className="mb-3 flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex-1">
                          <AppSelect
                            value={String(ingredient.inventoryId || "")}
                            onValueChange={(value) => handleIngredientSelect(idx, value)}
                            className="w-full rounded-xl px-3 py-3 text-sm font-bold text-slate-700"
                            placeholder="Select Item"
                            options={[
                              { label: "Select Item", value: "" },
                              ...inventory.map((item) => ({ label: item.item, value: String(item.id) })),
                            ]}
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
                        <div className="w-14 pb-3 text-[10px] font-black uppercase text-slate-400">{ingredient.unit || '-'}</div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, ingredients: formData.ingredients.filter((_, i) => i !== idx) })}
                          className="pb-2 text-red-500 transition hover:text-red-700"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="sticky bottom-0 bg-white pt-4">
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 p-4 text-xs font-black uppercase text-slate-700 transition hover:bg-slate-50">
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
              setFormData({ ...meal, paxSize: meal.paxSize || meal.pax_size || 50 });
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
            message={deleteTarget ? `Delete ${titleCase(deleteTarget.name)} permanently?` : ""}
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
