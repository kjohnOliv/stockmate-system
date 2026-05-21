'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { ApiClient } from "@/lib/api";
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { AlertNotice, FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { Input } from "@/components/ui/input";
import {
  formatLocalDateKey,
  MealPlanRecord,
  normalizeMealPlanRecords,
  normalizeRecipes,
  PlannerRecipe,
  syncMealPlanRecordsWithRecipes,
} from "@/lib/meal-planning";

interface Ingredient {
  id: number;
  item: string;
  category: string;
  threshold: number;
  unit: string;
  qty: number;
  price: number;
}

type InventoryRow = Ingredient & {
  todayDeduction: number;
  liveQty: number;
};

type FormData = {
  id: number | null;
  item: string;
  category: string;
  threshold: number;
  unit: string;
  qty: number;
  price: number;
};

const CATEGORY_OPTIONS = ["Vegetable", "Meat", "Dairy", "Frozen", "Canned", "Baked", "Protein", "Fruits", "Processed", "Staple", "Seasonings", "Condiments", "Others"];
const PAGE_SIZE = 5;
const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'liters', 'packs'];

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatQuantityWithUnit(quantity: number, unit: string) {
  const normalizedUnit = String(unit ?? "").trim();
  const formattedQty = Number(quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return normalizedUnit ? `${formattedQty} ${normalizedUnit}` : formattedQty;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { refreshVersions } = useNotifications();
  const role = user?.role?.toLowerCase() || "";
  const canAdd = role === "cook" || role === "staff";
  const canManageStocks = role === "staff" || role === "cook";
  const canDelete = false;

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlanRecord | null>(null);
  const [recipes, setRecipes] = useState<PlannerRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStock, setFilterStock] = useState("All Stock Levels");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState<FormData>({
    id: null,
    item: "",
    category: CATEGORY_OPTIONS[0],
    threshold: 0,
    unit: "pcs",
    qty: 0,
    price: 0,
  });
  const lockIdentityFields = role === "staff" && Boolean(formData.id);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(""); // Clear previous errors on retry
      const [inventoryRes, activePlanRes, recipesRes] = await Promise.all([
        ApiClient.get("/api/inventory"),
        ApiClient.get("/api/meal-plans/active").catch(() => null),
        ApiClient.get("/api/recipes").catch(() => null),
      ]);

      // If inventoryRes is null or failed, the ApiClient throws, handled by catch block
      const inventoryResult = await inventoryRes.json();
      const inventoryData = inventoryResult?.success ? inventoryResult.data : inventoryResult?.data ?? inventoryResult;
      setIngredients(Array.isArray(inventoryData) ? inventoryData : []);

      if (activePlanRes) {
        const activePlanResult = await activePlanRes.json();
        const activePlanData = activePlanResult?.data ?? activePlanResult;
        const normalizedActivePlan = normalizeMealPlanRecords(activePlanData ? [activePlanData] : []);
        setActivePlan(normalizedActivePlan[0] ?? null);
      } else {
        setActivePlan(null);
      }

      if (recipesRes) {
        const recipesResult = await recipesRes.json();
        const recipesData = recipesResult?.success ? recipesResult.data : recipesResult?.data ?? recipesResult;
        setRecipes(normalizeRecipes(recipesData));
      } else {
        setRecipes([]);
      }
    } catch (err: unknown) {
      console.error("Inventory fetch failed", err);
      setError(err instanceof Error ? err.message : "A database error occurred while fetching inventory.");
      setIngredients([]);
      setActivePlan(null);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [fetchData, refreshVersions.inventory, refreshVersions.mealPlans, user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  const inventoryWithLiveUsage = useMemo<InventoryRow[]>(() => {
    const syncedPlan = activePlan ? syncMealPlanRecordsWithRecipes([activePlan], recipes)[0] ?? activePlan : null;
    const todayKey = formatLocalDateKey();
    const todayPlan = syncedPlan?.planData.find((day) => day.isoDate === todayKey);

    if (!todayPlan || todayPlan.isHoliday) {
      return ingredients.map((ingredient) => ({
        ...ingredient,
        todayDeduction: 0,
        liveQty: Number(ingredient.qty ?? 0),
      }));
    }

    const usageByInventoryId = new Map<number, number>();
    const usageByName = new Map<string, number>();

    Object.values(todayPlan.meals).forEach((meal) => {
      meal.items.forEach((item) => {
        const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
        const multiplier = item.pax > 0 ? item.pax / basePax : 0;

        (item.ingredients ?? []).forEach((ingredient) => {
          const quantity = Number(ingredient.qty ?? 0) * multiplier;
          const inventoryId = Number(ingredient.inventoryId ?? 0);
          const normalizedName = String(ingredient.itemName ?? ingredient.name ?? "").trim().toLowerCase();

          if (inventoryId > 0) {
            usageByInventoryId.set(inventoryId, (usageByInventoryId.get(inventoryId) ?? 0) + quantity);
          } else if (normalizedName) {
            usageByName.set(normalizedName, (usageByName.get(normalizedName) ?? 0) + quantity);
          }
        });
      });
    });

    return ingredients.map((ingredient) => {
      const baseQty = Number(ingredient.qty ?? 0);
      const todayDeduction =
        usageByInventoryId.get(ingredient.id) ??
        usageByName.get(String(ingredient.item).trim().toLowerCase()) ??
        0;

      return {
        ...ingredient,
        todayDeduction,
        liveQty: Math.max(0, baseQty - todayDeduction),
      };
    });
  }, [activePlan, ingredients, recipes]);

  const filteredIngredients = useMemo(() => {
    return inventoryWithLiveUsage.filter((ingredient) => {
      const stockStatus = ingredient.liveQty <= 0 ? "NO STOCK" : ingredient.liveQty <= ingredient.threshold ? "LOW STOCK" : "IN STOCK";
      const matchesSearch = ingredient.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "All Categories" || ingredient.category === filterCategory;
      const matchesStock = filterStock === "All Stock Levels" || stockStatus === filterStock;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [filterCategory, filterStock, inventoryWithLiveUsage, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredIngredients.length / PAGE_SIZE));
  const paginatedIngredients = filteredIngredients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedName = toTitleCase(formData.item.trim());
    const duplicate = ingredients.find(
      (ingredient) => ingredient.id !== formData.id && ingredient.item.trim().toLowerCase() === normalizedName.toLowerCase()
    );

    if (duplicate) {
      setError(`"${normalizedName}" is already in the inventory table.`);
      return;
    }

    const payload = {
      item: normalizedName,
      category: formData.category,
      qty: Number(formData.qty),
      threshold: Number(formData.threshold),
      unit: formData.unit,
      price: Number(formData.price),
    };

    try {
      if (formData.id) {
        await ApiClient.put(`/api/inventory/${formData.id}`, payload);
      } else {
        await ApiClient.post("/api/inventory", payload);
      }
      await fetchData();
      setIsModalOpen(false);
      setFormData({ id: null, item: "", category: CATEGORY_OPTIONS[0], threshold: 0, unit: "pcs", qty: 0, price: 0 });
    } catch (error) {
      console.error("Save ingredient failed", error);
      setError(error instanceof Error ? error.message : "Failed to save ingredient.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await ApiClient.delete(`/api/inventory/${confirmDelete.id}`);
      await fetchData();
      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const getStatusStyle = (qty: number, threshold: number) => {
    if (qty <= 0) return 'bg-red-100 text-red-700';
    if (qty <= threshold) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getStatusLabel = (qty: number, threshold: number) => {
    if (qty <= 0) return 'No Stock';
    if (qty <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  if (loading && ingredients.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#2f6f4f]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f4f5ef] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Inventory</h1>
            <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Track live stock, pricing, and ingredient availability.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Today&apos;s approved menu is deducted from the displayed quantity only for live viewing.</p>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && !isModalOpen && (
          <div className="mb-6">
            <AlertNotice message={error} variant="error" />
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search by ingredient name"
              className="app-search-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AppSelect
            value={filterCategory}
            onValueChange={setFilterCategory}
            className="min-w-[210px] px-4 py-3"
            options={[
              { label: "All Categories", value: "All Categories" },
              ...CATEGORY_OPTIONS.map((cat) => ({ label: cat, value: cat })),
            ]}
          />
          <AppSelect
            value={filterStock}
            onValueChange={setFilterStock}
            className="min-w-[210px] px-4 py-3"
            options={[
              { label: "All Stock Levels", value: "All Stock Levels" },
              { label: "In Stock", value: "IN STOCK" },
              { label: "Low Stock", value: "LOW STOCK" },
              { label: "No Stock", value: "NO STOCK" },
            ]}
          />
          {canAdd && (
            <button
              onClick={() => {
                setError("");
                setFormData({ id: null, item: "", category: CATEGORY_OPTIONS[0], threshold: 0, unit: "pcs", qty: 0, price: 0 });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f6f4f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#285f44]"
            >
              <Plus size={18} /> Add Ingredient
            </button>
          )}
        </div>

        <div className="app-table-shell">
          <div className="hidden-scrollbar overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6f4f]">
                <tr>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Today&apos;s Usage</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  {canManageStocks && <th className="px-5 py-3.5">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedIngredients.length > 0 ? (
                  paginatedIngredients.map((ingredient) => (
                    <tr key={ingredient.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4 font-black text-slate-900">{toTitleCase(ingredient.item)}</td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{toTitleCase(ingredient.category)}</td>
                      <td className={`px-5 py-4 font-bold ${ingredient.liveQty <= ingredient.threshold ? "text-red-500" : "text-slate-700"}`}>
                        {formatQuantityWithUnit(ingredient.liveQty, ingredient.unit)}
                      </td>
                      <td className={`px-5 py-4 font-bold ${ingredient.todayDeduction > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {formatQuantityWithUnit(ingredient.todayDeduction, ingredient.unit)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">P{ingredient.price}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(ingredient.liveQty, ingredient.threshold)}`}>
                          {getStatusLabel(ingredient.liveQty, ingredient.threshold)}
                        </span>
                      </td>
                      {canManageStocks && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setFormData(ingredient);
                                setIsModalOpen(true);
                              }}
                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(ingredient)}
                                className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                                aria-label={`Delete ${ingredient.item}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManageStocks ? 7 : 6} className="px-6 py-14 text-center font-bold text-slate-400">
                      {loading ? "Updating inventory..." : "No ingredients found matching your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
            <p className="text-sm font-semibold text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + (paginatedIngredients.length ? 1 : 0)}-{(currentPage - 1) * PAGE_SIZE + paginatedIngredients.length} of {filteredIngredients.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="min-w-20 text-center text-sm font-black text-[#2f6f4f]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-black text-slate-900">{formData.id ? "Update Stock Item" : "Add Ingredient"}</h2>
            {error && <div className="mb-4"><AlertNotice message={error} variant="error" /></div>}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ingredient Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    disabled={lockIdentityFields}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Category</label>
                  <AppSelect
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    className="w-full px-4 py-2.5 font-bold disabled:pointer-events-none disabled:opacity-70"
                    disabled={lockIdentityFields}
                    options={CATEGORY_OPTIONS.map((cat) => ({ label: cat, value: cat }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Unit</label>
                  <AppSelect
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    className="w-full px-4 py-2.5 font-bold"
                    options={UNIT_OPTIONS.map((unit) => ({ label: unit, value: unit }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Current Quantity</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Threshold</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#2f6f4f] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#285f44]"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FeedbackDialog
        open={Boolean(confirmDelete)}
        title="Delete Ingredient"
        message={confirmDelete ? `Delete ${confirmDelete.item}? This cannot be undone.` : ""}
        variant="warning"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
