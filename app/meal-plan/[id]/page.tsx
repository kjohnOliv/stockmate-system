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
import { ApiClient } from "@/lib/api";
import {
  DayPlan,
  estimateItemCost,
  estimateItemPerPersonCost,
  MealPlanRecord,
  normalizeMealPlanRecords,
  normalizePlanStatus,
  PlannedMealItem,
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
  const { isStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<"schedule" | "checklist">(
    (searchParams.get("tab") as "schedule" | "checklist") || "schedule"
  );
  const [planRecord, setPlanRecord] = useState<MealPlanRecord | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const [planResponse, inventoryResponse] = await Promise.all([
          ApiClient.get("/api/meal-plans"),
          ApiClient.get("/api/inventory"),
        ]);

        if (!planResponse.ok) throw new Error(`Meal plan request failed with ${planResponse.status}`);

        const planResult = await planResponse.json();
        const planList = planResult?.success ? planResult.data : planResult?.data ?? planResult;
        const records = normalizeMealPlanRecords(planList);
        setPlanRecord(records.find((record) => String(record.id) === id) ?? null);

        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json();
          const items = inventoryResult?.success ? inventoryResult.data : inventoryResult?.data ?? inventoryResult;
          setInventoryItems(Array.isArray(items) ? items : []);
        } else {
          setInventoryItems([]);
        }
      } catch (error) {
        console.error("Failed to load meal plan analytics", error);
        setPlanRecord(null);
        setInventoryItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const checklist = useMemo(
    () => buildChecklist(planRecord?.planData ?? [], inventoryItems),
    [planRecord, inventoryItems]
  );
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
    return normalizePlanStatus(planRecord.status) === "approved" && planRecord.dateFrom <= today && planRecord.dateTo >= today;
  }, [planRecord]);

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
            onClick={() => router.push("/meal-plan")}
            className="mt-6 inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl"
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
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        {isStaff && !isCurrentApprovedPlan ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
            <h1 className="text-2xl font-black uppercase text-slate-800">No Approved Current Plan</h1>
            <p className="text-slate-500 mt-3">Staff can only view the currently approved meal plan and checklist.</p>
            <button
              onClick={() => router.push("/meal-plan")}
              className="mt-6 inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl"
            >
              <ArrowLeft size={18} />
              Back to Meal Planner
            </button>
          </div>
        ) : (
          <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/meal-plan")}
              className="bg-black text-white p-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                Plan Details <span className="text-[#76ba53]">#{planRecord.id}</span>
              </h1>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-1">
                {planRecord.dateFrom} - {planRecord.dateTo}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="bg-white border-2 border-black px-5 py-3 rounded-xl font-black text-xs uppercase">
              Status: {planRecord.status}
            </div>
            <div className="bg-white border-2 border-black px-5 py-3 rounded-xl font-black text-xs uppercase">
              Est. Budget: ₱{analytics.totalEstimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <button className="bg-white border-2 border-black px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2">
              <Printer size={18} /> Print Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <PhilippinePeso size={18} />
              <p className="text-xs uppercase font-black">Inventory-Based Cost</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">
              ₱{analytics.totalEstimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Calculated from inventory item prices matched to recipe ingredients.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart size={18} />
              <p className="text-xs uppercase font-black">Purchase Gap</p>
            </div>
            <p className="text-2xl font-black text-red-500 mt-2">
              ₱{analytics.totalShortageCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Estimated value of shortages based on remaining ingredient gaps.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <PackageSearch size={18} />
              <p className="text-xs uppercase font-black">Inventory Coverage</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">
              {analytics.coveredIngredients}/{checklist.length || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Ingredients matched to an inventory item with live stock and pricing.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={18} />
              <p className="text-xs uppercase font-black">Planned Servings</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">{totalServings}</p>
            <p className="text-xs text-slate-500 mt-1">Total servings scheduled across the full meal plan.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <PhilippinePeso size={18} />
              <p className="text-xs uppercase font-black">Cost Per Serving</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">
              ₱{perServingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Estimated ingredient cost divided by the total planned servings.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart size={18} />
              <p className="text-xs uppercase font-black">Average Dish Cost</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">
              ₱{mealItemAnalytics.averageMealItemCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Average estimated cost for each scheduled breakfast, lunch, or snack item.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <PackageSearch size={18} />
              <p className="text-xs uppercase font-black">Scheduled Dishes</p>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">{mealItemAnalytics.totalMealItems}</p>
            <p className="text-xs text-slate-500 mt-1">Total number of meal entries included across the entire weekly plan.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-200 p-1.5 rounded-[2rem] w-fit border-2 border-black">
          {(["schedule", "checklist"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                router.push(`/meal-plan/${planRecord.id}?tab=${tab}`, { scroll: false });
              }}
              className={`flex items-center gap-2 px-6 md:px-8 py-3 rounded-[1.5rem] font-black text-xs uppercase transition-all ${
                activeTab === tab
                  ? "bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "text-slate-500 hover:text-black"
              }`}
            >
              {tab === "schedule" ? <Calendar size={16} /> : <ShoppingCart size={16} />}
              {tab === "schedule" ? "Weekly Schedule" : "Grocery Checklist"}
            </button>
          ))}
        </div>

        {activeTab === "schedule" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {planRecord.planData.map((day) => (
              <div
                key={day.isoDate ?? day.date}
                className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col"
              >
                <div className="bg-[#FFF9C4] border-b-2 border-black p-4 text-center">
                  <h3 className="font-black uppercase tracking-widest text-sm">{day.dayName}</h3>
                  <p className="text-xs font-bold mt-1">{day.date}</p>
                </div>

                <div className="p-6 space-y-6 flex-grow">
                  {day.isHoliday ? (
                    <p className="font-black text-slate-400 uppercase text-center py-10">Holiday</p>
                  ) : (
                    (["Breakfast", "Lunch", "Snack"] as const).map((mealType) => (
                      <div key={mealType}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          {mealType}
                        </label>
                        <div className="space-y-2">
                          {day.meals[mealType].items.length === 0 ? (
                            <p className="text-sm text-slate-300 italic">Not scheduled</p>
                          ) : (
                            day.meals[mealType].items.map((item) => (
                              <div key={item.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {item.pax} pax
                                  {item.allergens?.trim() ? ` • Allergens: ${item.allergens}` : ""}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Per person: ₱{estimateItemPerPersonCost(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
          <div className="bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-[#FFF9C4] border-b-2 border-black font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-5 border-r-2 border-black text-center w-20">Status</th>
                  <th className="p-5 border-r-2 border-black">Ingredient</th>
                  <th className="p-5 border-r-2 border-black text-center">Required</th>
                  <th className="p-5 border-r-2 border-black text-center">In Stock</th>
                  <th className="p-5 border-r-2 border-black text-center">Shortage</th>
                  <th className="p-5 border-r-2 border-black text-center">Unit Price</th>
                  <th className="p-5">Estimated Price</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {checklist.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No ingredient checklist available for this meal plan yet.
                    </td>
                  </tr>
                ) : (
                  checklist.map((item) => (
                    <tr key={`${item.item}-${item.unit}`} className="hover:bg-yellow-50/30 transition-colors font-bold group">
                      <td className="p-5 border-r-2 border-black text-center">
                        {item.status === "done" ? (
                          <div className="flex justify-center">
                            <CheckCircle2 className="text-[#76ba53]" size={24} />
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <AlertCircle className="text-red-400" size={24} />
                          </div>
                        )}
                      </td>
                      <td className="p-5 border-r-2 border-black">
                        <p className="text-slate-800 text-lg leading-none mb-1">{item.item}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-black uppercase text-slate-500">
                            {item.category}
                          </span>
                          {!item.matchedInventory && (
                            <span className="text-[9px] px-2 py-0.5 bg-red-50 border border-red-200 rounded font-black uppercase text-red-500">
                              No inventory match
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 border-r-2 border-black text-center">
                        {item.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                      </td>
                      <td className="p-5 border-r-2 border-black text-center">
                        {item.inventoryQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                      </td>
                      <td className="p-5 border-r-2 border-black text-center">
                        <span className={item.shortageQty > 0 ? "text-red-500" : "text-green-600"}>
                          {item.shortageQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                        </span>
                      </td>
                      <td className="p-5 border-r-2 border-black text-center">
                        ₱{item.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-5 italic text-slate-400 group-hover:text-black transition-colors">
                        ₱{item.estPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
