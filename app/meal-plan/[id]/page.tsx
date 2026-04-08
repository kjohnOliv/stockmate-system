"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  PackageSearch,
  PhilippinePeso,
  Printer,
  ShoppingCart,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { ApiClient, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import {
  DayPlan,
  estimateItemCost,
  estimateItemPerPersonCost,
  MealPlanRecord,
  normalizeMealPlanRecords,
  normalizePlanStatus,
  normalizeRecipes,
  PlannedMealItem,
  syncMealPlanRecordsWithRecipes,
} from "@/lib/meal-planning";

interface InventoryItem {
  id: number;
  item: string;
  category: string;
  threshold: number;
  unit: string;
  qty: number;
  price: number;
}

type ChecklistRow = {
  item: string;
  category: string;
  requiredQty: number;
  unit: string;
  estPrice: number;
  inventoryQty: number;
  unitPrice: number;
  shortageQty: number;
  matchedInventory: boolean;
  status: "done" | "pending";
};

type AnalyticsSummary = {
  totalEstimatedCost: number;
  totalShortageCost: number;
  coveredIngredients: number;
  lowCoverageIngredients: number;
  fullyCoveredIngredients: number;
};

type MealItemAnalytics = {
  totalMealItems: number;
  averageMealItemCost: number;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildChecklist(planData: DayPlan[], inventory: InventoryItem[]): ChecklistRow[] {
  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const inventoryByName = new Map(inventory.map((item) => [normalizeText(item.item), item]));
  const byIngredient = new Map<string, ChecklistRow>();

  planData.forEach((day) => {
    if (day.isHoliday) return;

    Object.values(day.meals).forEach((meal) => {
      meal.items.forEach((item: PlannedMealItem) => {
        const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
        const multiplier = item.pax / basePax;

        (item.ingredients ?? []).forEach((ingredient) => {
          const ingredientName = ingredient.itemName || ingredient.name || "Unknown Ingredient";
          const key = `${normalizeText(ingredientName)}-${ingredient.unit}`;
          const matchedInventory =
            (ingredient.inventoryId ? inventoryById.get(Number(ingredient.inventoryId)) : undefined) ??
            inventoryByName.get(normalizeText(ingredientName));
          const quantity = Number(ingredient.qty ?? 0) * multiplier;
          const unitPrice = Number(matchedInventory?.price ?? ingredient.avgPrice ?? 0);
          const inventoryQty = Number(matchedInventory?.qty ?? 0);
          const category = matchedInventory?.category || ingredientName;

          if (byIngredient.has(key)) {
            const existing = byIngredient.get(key)!;
            existing.requiredQty += quantity;
            existing.estPrice += quantity * unitPrice;
            existing.inventoryQty = Math.max(existing.inventoryQty, inventoryQty);
            existing.unitPrice = existing.unitPrice || unitPrice;
            existing.shortageQty = Math.max(0, existing.requiredQty - existing.inventoryQty);
            existing.matchedInventory = existing.matchedInventory || Boolean(matchedInventory);
            existing.status = existing.shortageQty <= 0 ? "done" : "pending";
            existing.category = existing.category || category;
          } else {
            const shortageQty = Math.max(0, quantity - inventoryQty);
            byIngredient.set(key, {
              item: ingredientName,
              category,
              requiredQty: quantity,
              unit: ingredient.unit || matchedInventory?.unit || "",
              estPrice: quantity * unitPrice,
              inventoryQty,
              unitPrice,
              shortageQty,
              matchedInventory: Boolean(matchedInventory),
              status: shortageQty <= 0 ? "done" : "pending",
            });
          }
        });
      });
    });
  });

  return Array.from(byIngredient.values()).sort((a, b) => a.item.localeCompare(b.item));
}

function buildAnalytics(checklist: ChecklistRow[]): AnalyticsSummary {
  return checklist.reduce(
    (summary, row) => {
      summary.totalEstimatedCost += row.estPrice;
      summary.totalShortageCost += row.shortageQty * row.unitPrice;
      if (row.matchedInventory) summary.coveredIngredients += 1;
      if (row.shortageQty > 0 || !row.matchedInventory) {
        summary.lowCoverageIngredients += 1;
      } else {
        summary.fullyCoveredIngredients += 1;
      }
      return summary;
    },
    {
      totalEstimatedCost: 0,
      totalShortageCost: 0,
      coveredIngredients: 0,
      lowCoverageIngredients: 0,
      fullyCoveredIngredients: 0,
    } satisfies AnalyticsSummary
  );
}

function getTotalServings(planData: DayPlan[]) {
  return planData.reduce((sum, day) => {
    if (day.isHoliday) return sum;
    return (
      sum +
      Object.values(day.meals).reduce((mealTotal, meal) => {
        return mealTotal + meal.items.reduce((itemTotal, item) => itemTotal + item.pax, 0);
      }, 0)
    );
  }, 0);
}

function getMealItemAnalytics(planData: DayPlan[]): MealItemAnalytics {
  let totalMealItems = 0;
  let totalMealItemCost = 0;

  planData.forEach((day) => {
    if (day.isHoliday) return;

    Object.values(day.meals).forEach((meal) => {
      meal.items.forEach((item) => {
        totalMealItems += 1;
        totalMealItemCost += estimateItemCost(item as PlannedMealItem);
      });
    });
  });

  return {
    totalMealItems,
    averageMealItemCost: totalMealItems > 0 ? totalMealItemCost / totalMealItems : 0,
  };
}

export default function MealPlanDetailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { isAdmin, isStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<"schedule" | "checklist">(
    (searchParams.get("tab") as "schedule" | "checklist") || "schedule"
  );
  const [planRecord, setPlanRecord] = useState<MealPlanRecord | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, ChecklistRow["status"]>>({});

  const formatCurrency = (value: number) =>
    `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const goBackToPlanner = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/meal-plan");
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "schedule" || tab === "checklist") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const requests: Promise<Response>[] = [
          ApiClient.get(isStaff ? "/api/meal-plans/active" : "/api/meal-plans"),
          ApiClient.get("/api/inventory"),
        ];
        if (!isStaff) requests.push(ApiClient.get("/api/recipes"));

        const [planResponse, inventoryResponse, recipeResponse] = await Promise.all(requests);

        if (!planResponse.ok) throw new Error(`Meal plan request failed with ${planResponse.status}`);

        const planResult = await planResponse.json();
        const planList = isStaff
          ? planResult?.data
            ? [planResult.data]
            : Array.isArray(planResult)
            ? planResult
            : planResult
            ? [planResult]
            : []
          : planResult?.success
          ? planResult.data
          : planResult?.data ?? planResult;
        const recipeResult = recipeResponse?.ok ? await recipeResponse.json() : [];
        const recipeList = recipeResult?.success ? recipeResult.data : recipeResult?.data ?? recipeResult;
        const records = syncMealPlanRecordsWithRecipes(
          normalizeMealPlanRecords(planList),
          normalizeRecipes(recipeList)
        );

        setPlanRecord(records.find((record) => String(record.id) === id) ?? null);

        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json();
          const items = inventoryResult?.success ? inventoryResult.data : inventoryResult?.data ?? inventoryResult;
          setInventoryItems(Array.isArray(items) ? items : []);
        } else {
          setInventoryItems([]);
        }
      } catch (error) {
        if (error instanceof Error && isPasswordChangeRequiredErrorMessage(error.message)) return;
        console.error("Failed to load meal plan analytics", error);
        setPlanRecord(null);
        setInventoryItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isStaff]);

  useEffect(() => {
    setBudgetDraft(planRecord?.estimatedBudget !== undefined ? String(planRecord.estimatedBudget) : "");
    setEditingBudget(false);
    setChecklistOverrides({});
  }, [planRecord]);

  const checklist = useMemo(() => {
    const rows = buildChecklist(planRecord?.planData ?? [], inventoryItems);
    return rows.map((row) => {
      const key = `${normalizeText(row.item)}-${normalizeText(row.unit)}`;
      const override = checklistOverrides[key];
      return override ? { ...row, status: override } : row;
    });
  }, [checklistOverrides, inventoryItems, planRecord]);

  const analytics = useMemo(() => buildAnalytics(checklist), [checklist]);
  const totalServings = useMemo(() => getTotalServings(planRecord?.planData ?? []), [planRecord]);
  const mealItemAnalytics = useMemo(() => getMealItemAnalytics(planRecord?.planData ?? []), [planRecord]);
  const perServingCost = useMemo(
    () => (totalServings > 0 ? analytics.totalEstimatedCost / totalServings : 0),
    [analytics.totalEstimatedCost, totalServings]
  );
  const isCurrentApprovedPlan = useMemo(() => {
    if (!planRecord) return false;
    const today = new Date().toISOString().slice(0, 10);
    return (
      normalizePlanStatus(planRecord.status) === "approved" &&
      planRecord.dateFrom <= today &&
      planRecord.dateTo >= today
    );
  }, [planRecord]);
  const displayedBudget = planRecord?.estimatedBudget ?? analytics.totalEstimatedCost;

  const handleBudgetSave = async () => {
    if (!planRecord) return;

    const nextBudget = Number(budgetDraft);
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      alert("Enter a valid estimated budget.");
      return;
    }

    try {
      setIsSavingBudget(true);
      const response = await ApiClient.patch(`/api/meal-plans/${planRecord.id}`, {
        estimated_budget: nextBudget,
      });
      if (!response.ok) throw new Error(`Budget update failed with ${response.status}`);

      setPlanRecord((current) => (current ? { ...current, estimatedBudget: nextBudget } : current));
      setEditingBudget(false);
    } catch (error) {
      console.error("Budget update failed", error);
      alert("Budget update is not supported by the current backend endpoint yet.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const toggleChecklistStatus = (item: ChecklistRow) => {
    if (!isStaff) return;
    const key = `${normalizeText(item.item)}-${normalizeText(item.unit)}`;
    setChecklistOverrides((current) => ({
      ...current,
      [key]: item.status === "done" ? "pending" : "done",
    }));
  };

  if (!id) return <div className="p-8 font-black uppercase text-red-500">Error: Missing Plan ID</div>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <Loader2 className="animate-spin text-[#76ba53]" size={36} />
      </div>
    );
  }

  if (!planRecord) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-8">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black uppercase">Meal Plan Not Found</h1>
          <p className="text-slate-500 mt-3">The selected meal plan could not be loaded from the API.</p>
          <button
            type="button"
            onClick={goBackToPlanner}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back to Meal Planner
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "cook", "staff"]}>
      <div className="min-h-screen bg-[#F3F4F6] p-4 font-sans text-slate-800 md:p-8">
        <div className="mx-auto max-w-7xl">
          {isStaff && !isCurrentApprovedPlan ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
              <h1 className="text-2xl font-black uppercase text-slate-800">No Approved Current Plan</h1>
              <p className="mt-3 text-slate-500">
                Staff can only view the currently approved meal plan and checklist.
              </p>
              <button
                type="button"
                onClick={goBackToPlanner}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
                Back to Meal Planner
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={goBackToPlanner}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Go back"
                  >
                    <ArrowLeft size={26} strokeWidth={2.25} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-black uppercase italic leading-none tracking-tighter">
                      Plan Details <span className="text-[#76ba53]">#{planRecord.id}</span>
                    </h1>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {planRecord.dateFrom} - {planRecord.dateTo}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                  <div className="rounded-xl border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase">
                    Status: {planRecord.status}
                  </div>
                  <div className="rounded-xl border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase">
                    {isAdmin && editingBudget ? (
                      <div className="flex items-center gap-2">
                        <span>Budget:</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold normal-case"
                        />
                        <button
                          type="button"
                          onClick={handleBudgetSave}
                          disabled={isSavingBudget}
                          className="rounded-md border border-black px-2 py-1 disabled:opacity-60"
                        >
                          {isSavingBudget ? "Saving" : "Save"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => isAdmin && setEditingBudget(true)}
                        className={isAdmin ? "cursor-pointer" : "cursor-default"}
                      >
                        Est. Budget: {formatCurrency(displayedBudget)}
                      </button>
                    )}
                  </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-6 py-3 text-xs font-black uppercase text-slate-700 shadow-sm"
              >
                <Printer size={18} /> Print Report
              </button>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <PhilippinePeso size={18} />
                    <p className="text-xs font-black uppercase">Inventory-Based Cost</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(analytics.totalEstimatedCost)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Calculated from inventory item prices matched to recipe ingredients.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ShoppingCart size={18} />
                    <p className="text-xs font-black uppercase">Purchase Gap</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-red-500">{formatCurrency(analytics.totalShortageCost)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Estimated value of shortages based on remaining ingredient gaps.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <PackageSearch size={18} />
                    <p className="text-xs font-black uppercase">Inventory Coverage</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">
                    {analytics.coveredIngredients}/{checklist.length || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ingredients matched to an inventory item with live stock and pricing.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={18} />
                    <p className="text-xs font-black uppercase">Planned Servings</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">{totalServings}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Total servings scheduled across the full meal plan.
                  </p>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <PhilippinePeso size={18} />
                    <p className="text-xs font-black uppercase">Cost Per Serving</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(perServingCost)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Estimated ingredient cost divided by the total planned servings.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ShoppingCart size={18} />
                    <p className="text-xs font-black uppercase">Average Dish Cost</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">
                    {formatCurrency(mealItemAnalytics.averageMealItemCost)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Average estimated cost for each scheduled breakfast, lunch, or snack item.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <PackageSearch size={18} />
                    <p className="text-xs font-black uppercase">Scheduled Dishes</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">{mealItemAnalytics.totalMealItems}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Total number of meal entries included across the entire weekly plan.
                  </p>
                </div>
              </div>

              <div className="mb-8 flex w-fit gap-2 rounded-[1.6rem] border border-emerald-100 bg-white p-1.5 shadow-sm">
                {(["schedule", "checklist"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      router.push(`/meal-plan/${planRecord.id}?tab=${tab}`, { scroll: false });
                    }}
                    className={`flex items-center gap-2 rounded-[1.2rem] px-6 py-3 text-xs font-black uppercase transition-all md:px-8 ${
                      activeTab === tab
                        ? "bg-[#2f6f4f] text-white shadow-sm"
                        : "text-slate-500 hover:bg-emerald-50 hover:text-[#2f6f4f]"
                    }`}
                  >
                    {tab === "schedule" ? <Calendar size={16} /> : <ShoppingCart size={16} />}
                    {tab === "schedule" ? "Weekly Schedule" : "Grocery Checklist"}
                  </button>
                ))}
              </div>

              {activeTab === "schedule" ? (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 xl:grid-cols-3">
                  {planRecord.planData.map((day) => (
                    <div
                      key={day.isoDate ?? day.date}
                      className="flex flex-col overflow-hidden rounded-[1.7rem] border border-emerald-100 bg-white shadow-[0_18px_40px_rgba(47,111,79,0.08)]"
                    >
                      <div className="table-header-emerald border-b border-emerald-100 p-4 text-center">
                        <h3 className="text-sm font-black uppercase tracking-widest">{day.dayName}</h3>
                        <p className="mt-1 text-xs font-bold">{day.date}</p>
                      </div>

                      <div className="flex-grow space-y-6 p-6">
                        {day.isHoliday ? (
                          <p className="py-10 text-center font-black uppercase text-slate-400">Holiday</p>
                        ) : (
                          (["Breakfast", "Lunch", "Snack"] as const).map((mealType) => (
                            <div key={mealType}>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {mealType}
                              </label>
                              <div className="space-y-2">
                                {day.meals[mealType].items.length === 0 ? (
                                  <p className="text-sm italic text-slate-300">Not scheduled</p>
                                ) : (
                                  day.meals[mealType].items.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <p className="leading-tight font-bold text-slate-800">{item.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {item.pax} pax
                                        {item.allergens?.trim() ? ` • Allergens: ${item.allergens}` : ""}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Per person: {formatCurrency(estimateItemPerPersonCost(item))}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden rounded-[1.7rem] border border-emerald-100 bg-white shadow-[0_18px_40px_rgba(47,111,79,0.08)]">
                  <div className="hidden-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[950px] border-collapse text-left">
                    <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-widest text-[#2f6f4f]">
                      <tr>
                        <th className="w-20 border-r border-emerald-100 p-5 text-center">Status</th>
                        <th className="border-r border-emerald-100 p-5">Ingredient</th>
                        <th className="border-r border-emerald-100 p-5 text-center">Required</th>
                        <th className="border-r border-emerald-100 p-5 text-center">In Stock</th>
                        <th className="border-r border-emerald-100 p-5 text-center">Shortage</th>
                        <th className="border-r border-emerald-100 p-5 text-center">Unit Price</th>
                        <th className="p-5">Estimated Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {checklist.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No ingredient checklist available for this meal plan yet.
                          </td>
                        </tr>
                      ) : (
                        checklist.map((item) => (
                          <tr
                            key={`${item.item}-${item.unit}`}
                            onClick={() => toggleChecklistStatus(item)}
                            className={`group font-bold transition-colors ${isStaff ? "cursor-pointer hover:bg-emerald-50/40" : ""}`}
                            aria-label={isStaff ? `Toggle ${item.item} checklist status` : `${item.item} checklist status`}
                          >
                            <td className="border-r border-emerald-50 p-5 text-center">
                              {item.status === "done" ? (
                                <div className="flex justify-center">
                                  <CheckCircle2 className="text-[#2f6f4f]" size={24} />
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <AlertCircle className="text-red-400" size={24} />
                                </div>
                              )}
                            </td>
                            <td className="border-r border-emerald-50 p-5">
                              <p className="mb-1 text-lg leading-none text-slate-800">{item.item}</p>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-[#2f6f4f]">
                                  {item.category}
                                </span>
                                {!item.matchedInventory && (
                                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase text-red-500">
                                    No inventory match
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-r border-emerald-50 p-5 text-center">
                              {item.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                            </td>
                            <td className="border-r border-emerald-50 p-5 text-center">
                              {item.inventoryQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                            </td>
                            <td className="border-r border-emerald-50 p-5 text-center">
                              <span className={item.shortageQty > 0 ? "text-red-500" : "text-green-600"}>
                                {item.shortageQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                              </span>
                            </td>
                            <td className="border-r border-emerald-50 p-5 text-center">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="p-5 font-bold text-slate-500 transition-colors group-hover:text-[#2f6f4f]">
                              {formatCurrency(item.estPrice)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
