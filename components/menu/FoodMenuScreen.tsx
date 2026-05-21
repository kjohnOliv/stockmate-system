"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, Utensils } from "lucide-react";
import {
  DayPlan,
  estimateItemPerPersonCost,
  formatLocalDateKey,
  MealPlanRecord,
  normalizeActiveMealPlanPayload,
  normalizeMealPlanRecords,
  normalizeRecipes,
  normalizeTitleCase,
  PlannedMealItem,
  StatusType,
  syncMealPlanRecordsWithRecipes,
} from "@/lib/meal-planning";
import { ApiClient } from "@/lib/api";

type EnrichedMealItem = PlannedMealItem & {
  displayPrice: number;
  priceLabel: string;
};

type EnrichedMealCategoryPlan = {
  status: StatusType;
  items: EnrichedMealItem[];
};

type EnrichedDayPlan = Omit<DayPlan, "meals"> & {
  meals: {
    Breakfast: EnrichedMealCategoryPlan;
    Lunch: EnrichedMealCategoryPlan;
    Snack: EnrichedMealCategoryPlan;
  };
};

type FoodMenuScreenProps = {
  allowProtectedFallback: boolean;
  emptyStateMessage: string;
  failureStateMessage: string;
  mode?: "public" | "system";
  refreshIntervalMs?: number;
};

export default function FoodMenuScreen({
  allowProtectedFallback,
  emptyStateMessage,
  failureStateMessage,
  mode = "public",
  refreshIntervalMs = 15000,
}: FoodMenuScreenProps) {
  const [todayPlan, setTodayPlan] = useState<EnrichedDayPlan | null>(null);
  const [activePlanRecord, setActivePlanRecord] = useState<MealPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const formatCurrency = (value: number) =>
    `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatBoardDate = useCallback((value?: string) => {
    if (value?.trim()) return value;
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const normalizeIsoDate = useCallback((value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const getTodayKey = useCallback(() => {
    return formatLocalDateKey();
  }, []);

  const findTodayPlan = useCallback(
    (planData: DayPlan[]) => {
      const todayKey = getTodayKey();

      return (
        planData.find((day) => normalizeIsoDate(day.isoDate) === todayKey) ??
        planData.find((day) => normalizeIsoDate(day.date) === todayKey) ??
        null
      );
    },
    [getTodayKey, normalizeIsoDate]
  );

  const resolveCurrentApprovedPlan = useCallback(
    (records: MealPlanRecord[]) => {
      const todayKey = getTodayKey();

      return (
        records.find((record) => {
          const status = String(record.status || "").toLowerCase().trim();
          return (
            (status === "approved" || status === "published" || status === "ongoing") &&
            record.dateFrom <= todayKey &&
            record.dateTo >= todayKey
          );
        }) ??
        [...records].sort((a, b) => (b.dateFrom || "").localeCompare(a.dateFrom || ""))[0] ??
        null
      );
    },
    [getTodayKey]
  );

  const fetchActiveMenu = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");

      let activePlan: MealPlanRecord | null = null;
      let recipeData: unknown = [];

      try {
        const [publicMenuRes, publicRecipeRes] = await Promise.all([
          fetch(`${baseUrl}/mealplans/active/menu`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }),
          fetch(`${baseUrl}/recipes/`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }).catch(() => null),
        ]);

        if (publicMenuRes.ok) {
          const [publicMenuData, publicRecipesData] = await Promise.all([
            publicMenuRes.json(),
            publicRecipeRes?.ok ? publicRecipeRes.json() : Promise.resolve([]),
          ]);

          const publicPlanSource =
            publicMenuData?.success && publicMenuData.data !== undefined
              ? publicMenuData.data
              : publicMenuData?.data ?? publicMenuData;
          const normalizedPublicPlans = normalizeActiveMealPlanPayload(publicPlanSource);

          if (normalizedPublicPlans.length > 0) {
            activePlan = normalizedPublicPlans[0];
            recipeData = publicRecipesData;
          }
        }
      } catch {
        activePlan = null;
      }

      if (!activePlan && allowProtectedFallback) {
        try {
          const [menuRes, recipeRes] = await Promise.all([
            ApiClient.get("/api/meal-plans/active"),
            ApiClient.get("/api/recipes").catch(() => null),
          ]);

          const [responseData, protectedRecipeData] = await Promise.all([
            menuRes.json(),
            recipeRes?.ok ? recipeRes.json() : Promise.resolve([]),
          ]);

          const activePlanSource = responseData?.data ?? responseData;
          activePlan = normalizeActiveMealPlanPayload(activePlanSource)[0] ?? null;
          recipeData = protectedRecipeData;
        } catch {
          activePlan = null;
        }
      }

      if (!activePlan && allowProtectedFallback) {
        try {
          const [plansRes, recipeRes] = await Promise.all([
            ApiClient.get("/api/meal-plans"),
            ApiClient.get("/api/recipes").catch(() => null),
          ]);

          const [plansPayload, protectedRecipeData] = await Promise.all([
            plansRes.json(),
            recipeRes?.ok ? recipeRes.json() : Promise.resolve([]),
          ]);

          const rawPlans = plansPayload?.success
            ? plansPayload.data
            : plansPayload?.data ?? plansPayload;
          const normalizedPlans = normalizeMealPlanRecords(rawPlans);
          activePlan = resolveCurrentApprovedPlan(normalizedPlans);
          recipeData = protectedRecipeData;
        } catch {
          activePlan = null;
        }
      }

      if (!activePlan) {
        setError(emptyStateMessage);
        setTodayPlan(null);
        setActivePlanRecord(null);
        setLastUpdatedAt(new Date());
        return;
      }

      if (activePlan.planData && activePlan.planData.length > 0) {
        const recipePayload = recipeData as { data?: unknown[] } | unknown[];
        const rawRecipeList: unknown[] = Array.isArray((recipePayload as { data?: unknown[] })?.data)
          ? (recipePayload as { data?: unknown[] }).data ?? []
          : Array.isArray(recipePayload)
            ? recipePayload
            : [];
        const recipeList = normalizeRecipes(rawRecipeList);
        const syncedRecords = syncMealPlanRecordsWithRecipes([activePlan], recipeList);
        const syncedPlanRecord = syncedRecords[0] ?? activePlan;
        const planData = syncedPlanRecord.planData;
        const today = findTodayPlan(planData);

        if (!today) {
          setTodayPlan(null);
          setActivePlanRecord(syncedPlanRecord);
          setError("No meals scheduled for today");
          setLastUpdatedAt(new Date());
          return;
        }

        const enrichItem = (item: PlannedMealItem): EnrichedMealItem => {
          const completeItem: PlannedMealItem = {
            ...item,
            id: item.id ?? `student-menu-${item.name}-${item.pax}`,
            basePax: item.basePax ?? item.pax,
            price: item.price ?? 0,
            allergens: item.allergens ?? "",
            ingredients: item.ingredients,
          };

          return {
            ...completeItem,
            displayPrice:
              Number(completeItem.manualCostPerServing ?? 0) > 0
                ? Number(completeItem.manualCostPerServing ?? 0)
                : Number(completeItem.price ?? 0) > 0
                  ? Number(completeItem.price ?? 0)
                  : estimateItemPerPersonCost(completeItem),
            priceLabel:
              Number(completeItem.manualCostPerServing ?? 0) > 0
                ? "Published amount"
                : Number(completeItem.price ?? 0) > 0
                  ? "Price per serving"
                  : "Estimated per serving",
          };
        };

        const hasMeals = (["Breakfast", "Lunch", "Snack"] as const).some(
          (type) => today.meals?.[type]?.items?.length > 0
        );

        if (!hasMeals && !today.isHoliday) {
          const emptyTodayPlan: EnrichedDayPlan = {
            ...today,
            meals: {
              Breakfast: {
                status: today.meals.Breakfast.status,
                items: today.meals.Breakfast.items.map(enrichItem),
              },
              Lunch: {
                status: today.meals.Lunch.status,
                items: today.meals.Lunch.items.map(enrichItem),
              },
              Snack: {
                status: today.meals.Snack.status,
                items: today.meals.Snack.items.map(enrichItem),
              },
            },
          };
          setTodayPlan(emptyTodayPlan);
          setActivePlanRecord(syncedPlanRecord);
          setError("No meals scheduled for today");
          setLastUpdatedAt(new Date());
          return;
        }

        const todayWithCanonicalNames = findTodayPlan(planData);
        const sourcePlan = todayWithCanonicalNames ?? today;
        const enrichedToday: EnrichedDayPlan = {
          ...sourcePlan,
          meals: {
            Breakfast: {
              status: sourcePlan.meals.Breakfast.status,
              items: sourcePlan.meals.Breakfast.items.map(enrichItem),
            },
            Lunch: {
              status: sourcePlan.meals.Lunch.status,
              items: sourcePlan.meals.Lunch.items.map(enrichItem),
            },
            Snack: {
              status: sourcePlan.meals.Snack.status,
              items: sourcePlan.meals.Snack.items.map(enrichItem),
            },
          },
        };

        setTodayPlan(enrichedToday);
        setActivePlanRecord(syncedPlanRecord);
        setError(null);
        setLastUpdatedAt(new Date());
      } else {
        setTodayPlan(null);
        setActivePlanRecord(null);
        setError("No meals scheduled");
        setLastUpdatedAt(new Date());
      }
    } catch (err) {
      console.error("Error fetching food menu:", err);
      setError(failureStateMessage);
      setTodayPlan(null);
      setActivePlanRecord(null);
    } finally {
      setLoading(false);
    }
  }, [allowProtectedFallback, emptyStateMessage, failureStateMessage, findTodayPlan, resolveCurrentApprovedPlan]);

  useEffect(() => {
    fetchActiveMenu();

    const intervalId = window.setInterval(() => {
      fetchActiveMenu();
    }, refreshIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchActiveMenu();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchActiveMenu, refreshIntervalMs]);

  const isPublicMode = mode === "public";
  const loadingLabel = isPublicMode ? "Loading live menu board..." : "Loading today's menu...";
  const helperLabel = isPublicMode
    ? "Live menu board for today's approved meal plan"
    : "Current saved menu from the approved daily meal plan";
  const emptyHelpText = isPublicMode
    ? "The public screen will update automatically once today's approved meals are published."
    : "Check the current approved meal plan or try again later.";
  const noMealServiceState =
    error === emptyStateMessage ||
    error === "No meals scheduled for today" ||
    error === "No meals scheduled";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex animate-pulse flex-col items-center">
          <Utensils className="mb-4 h-12 w-12 text-blue-500" />
          <p className="font-medium text-gray-500">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  if ((error || !todayPlan) && !noMealServiceState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-200" />
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            {error ? error : "No Menu Published"}
          </h2>
          <p className="text-gray-500">{error ? emptyHelpText : "Check back later for today's meal schedule."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7df,_#eef5e8_52%,_#e4efe7)] px-3 py-6 md:px-5">
      <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-[#d8e4db] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(249,251,245,0.92))] px-5 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-[#2f6f4f] px-8 py-2 font-black text-white shadow-sm">
            {formatBoardDate(noMealServiceState ? undefined : todayPlan?.date)}
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl">Food Menu</h1>

          {!noMealServiceState ? (
            <>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                {helperLabel}
              </p>
              {activePlanRecord?.createdByName ? (
                <p className="mt-3 text-sm font-bold text-slate-600">
                  Meal Planner by {activePlanRecord.createdByName}
                  {activePlanRecord.createdByRole ? ` (${normalizeTitleCase(activePlanRecord.createdByRole)})` : ""}
                </p>
              ) : null}
              {lastUpdatedAt ? (
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Auto-refreshing every {Math.max(1, Math.round(refreshIntervalMs / 1000))} seconds.
                  Last synced at {lastUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {noMealServiceState || todayPlan?.isHoliday ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[1.25rem] border border-dashed border-[#c98d52] bg-white/70 p-10 text-center">
            <p className="text-3xl font-black uppercase tracking-tight text-[#d38b54] md:text-4xl">No meal service today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {([
              { key: "Breakfast", label: "Breakfast" },
              { key: "Lunch", label: "Lunch" },
              { key: "Snack", label: "Snacks" },
            ] as const).map(({ key, label }) => {
              const items = todayPlan?.meals[key].items ?? [];

              return (
                <section key={key} className="relative min-h-[420px] rounded-[1.15rem] border border-[#d8e4db] bg-white/90 px-5 pb-6 pt-12 shadow-sm">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#f0c95a] px-8 py-3 text-sm font-black uppercase text-slate-900 shadow-sm">
                    {label}
                  </div>

                  <div className="space-y-5">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <div key={`${key}-${index}-${item.name}`} className="border-b border-slate-200 pb-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xl font-black leading-tight text-slate-900">{item.name}</p>
                              {item.allergens && (
                                <p className="mt-1 text-sm italic text-slate-600">Allergens: {item.allergens}</p>
                              )}
                              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                {item.pax} servings planned
                              </p>
                            </div>
                            <p className="text-2xl font-black text-[#2f6f4f]">
                              {formatCurrency(Number(item.displayPrice ?? 0))}
                            </p>
                          </div>

                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            {item.priceLabel}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm italic text-slate-400">Not scheduled</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
