"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Utensils } from 'lucide-react';
import { estimateItemPerPersonCost, RecipeIngredient } from "@/lib/meal-planning";

interface MealItem {
  id?: string;
  name: string;
  pax: number;
  basePax?: number;
  price?: number;
  allergens?: string;
  ingredients?: RecipeIngredient[];
  perPersonPrice?: number;
}

interface MealCategory {
  items: MealItem[];
}

interface RecipeMenuMeta {
  name: string;
  price?: number;
  allergens?: string;
  paxSize?: number;
  ingredients?: RecipeIngredient[];
}

interface DayPlan {
  date: string;
  dayName: string;
  isoDate?: string;
  isHoliday: boolean;
  meals: {
    Breakfast: MealCategory;
    Lunch: MealCategory;
    Snack: MealCategory;
  };
}

export default function StudentActiveMenu() {
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveMenu();
  }, []);

  const normalizeIsoDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const findTodayPlan = (planData: DayPlan[]) => {
    const todayKey = getTodayKey();

    return (
      planData.find((day) => normalizeIsoDate(day.isoDate) === todayKey) ??
      planData.find((day) => normalizeIsoDate(day.date) === todayKey) ??
      null
    );
  };

  const fetchActiveMenu = async () => {
    try {
      setLoading(true);
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
      const [menuRes, recipeRes] = await Promise.all([
        fetch(`${baseUrl}/mealplans/active/menu`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetch(`${baseUrl}/recipes/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);
      
      if (!menuRes.ok) {
        setError("No published meal plan available");
        setTodayPlan(null);
        return;
      }

      const [responseData, recipeData] = await Promise.all([
        menuRes.json(),
        recipeRes.ok ? recipeRes.json() : Promise.resolve({}),
      ]);
      
      // Backend returns: { success: true, data: <JSONB plan_data> }
      // plan_data is an array of DayPlan objects
      let planData: DayPlan[] | null = null;

      if (responseData.success && responseData.data) {
        // Response is wrapped with success flag
        if (Array.isArray(responseData.data)) {
          planData = responseData.data;
        } else if (typeof responseData.data === 'string') {
          // If JSONB comes as string, parse it
          planData = JSON.parse(responseData.data);
        }
      } else if (Array.isArray(responseData)) {
        // Direct array response
        planData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        // data is an array
        planData = responseData.data;
      }

      if (planData && planData.length > 0) {
        const today = findTodayPlan(planData);
        if (!today) {
          setTodayPlan(null);
          setError("No meals scheduled for today");
          return;
        }

        const hasMeals = (['Breakfast', 'Lunch', 'Snack'] as const).some(
          (type) => today.meals?.[type]?.items?.length > 0
        );

        if (!hasMeals && !today.isHoliday) {
          setTodayPlan(today);
          setError("No meals scheduled for today");
          return;
        }

        const rawRecipeList: unknown[] = Array.isArray(recipeData?.data)
          ? recipeData.data
          : Array.isArray(recipeData)
          ? recipeData
          : [];
        const recipeList: RecipeMenuMeta[] = rawRecipeList
          .filter((recipe: unknown): recipe is Record<string, unknown> => typeof recipe === "object" && recipe !== null)
          .map((recipe: Record<string, unknown>) => ({
            name: String(recipe.name ?? ""),
            price: recipe.price === undefined ? undefined : Number(recipe.price),
            allergens: recipe.allergens === undefined ? undefined : String(recipe.allergens),
            paxSize:
              recipe.pax_size === undefined && recipe.paxSize === undefined
                ? undefined
                : Number(recipe.pax_size ?? recipe.paxSize),
            ingredients: Array.isArray(recipe.ingredients) ? (recipe.ingredients as RecipeIngredient[]) : undefined,
          }));
        const recipesByName = new Map<string, RecipeMenuMeta>(
          recipeList.map((recipe) => [recipe.name.trim().toLowerCase(), recipe])
        );

        const enrichedToday: DayPlan = {
          ...today,
          meals: {
            Breakfast: {
              items: today.meals.Breakfast.items.map((item) => {
                const recipe = recipesByName.get(item.name.trim().toLowerCase());
                return {
                  ...item,
                  basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                  price: item.price ?? Number(recipe?.price ?? 0),
                  allergens: item.allergens ?? String(recipe?.allergens ?? ""),
                  ingredients: item.ingredients ?? recipe?.ingredients,
                  perPersonPrice: estimateItemPerPersonCost({
                    ...item,
                    basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                    price: item.price ?? Number(recipe?.price ?? 0),
                    ingredients: item.ingredients ?? recipe?.ingredients,
                  }),
                };
              }),
            },
            Lunch: {
              items: today.meals.Lunch.items.map((item) => {
                const recipe = recipesByName.get(item.name.trim().toLowerCase());
                return {
                  ...item,
                  basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                  price: item.price ?? Number(recipe?.price ?? 0),
                  allergens: item.allergens ?? String(recipe?.allergens ?? ""),
                  ingredients: item.ingredients ?? recipe?.ingredients,
                  perPersonPrice: estimateItemPerPersonCost({
                    ...item,
                    basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                    price: item.price ?? Number(recipe?.price ?? 0),
                    ingredients: item.ingredients ?? recipe?.ingredients,
                  }),
                };
              }),
            },
            Snack: {
              items: today.meals.Snack.items.map((item) => {
                const recipe = recipesByName.get(item.name.trim().toLowerCase());
                return {
                  ...item,
                  basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                  price: item.price ?? Number(recipe?.price ?? 0),
                  allergens: item.allergens ?? String(recipe?.allergens ?? ""),
                  ingredients: item.ingredients ?? recipe?.ingredients,
                  perPersonPrice: estimateItemPerPersonCost({
                    ...item,
                    basePax: item.basePax ?? recipe?.paxSize ?? item.pax,
                    price: item.price ?? Number(recipe?.price ?? 0),
                    ingredients: item.ingredients ?? recipe?.ingredients,
                  }),
                };
              }),
            },
          },
        };

        setTodayPlan(enrichedToday);
        setError(null);
      } else {
        setTodayPlan(null);
        setError("No meals scheduled");
      }
    } catch (err) {
      console.error("Error fetching student menu:", err);
      setError("Failed to load menu");
      setTodayPlan(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <Utensils className="w-12 h-12 text-blue-500 mb-4" />
          <p className="text-gray-500 font-medium">Loading today's menu...</p>
        </div>
      </div>
    );
  }

  if (error || !todayPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-10 rounded-3xl shadow-sm border border-gray-100 max-w-md">
          <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {error ? error : "No Menu Published"}
          </h2>
          <p className="text-gray-500">
            {error ? "Check the current approved meal plan or try again later." : "Check back later for today's meal schedule."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4e4] py-6 px-4 md:px-8">
      <div className="max-w-6xl mx-auto rounded-[2rem] border border-[#efe0a2] bg-[#fffbe0] px-6 py-8 md:px-12 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-[#76ba53] px-8 py-2 text-white font-black rounded-full shadow-sm">
            {todayPlan.date || new Date().toLocaleDateString()}
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-black uppercase tracking-tight text-black">Food Menu</h1>
        </div>

        {todayPlan.isHoliday ? (
          <div className="rounded-[2rem] border border-dashed border-[#d38b54] bg-white/70 p-10 text-center">
            <p className="text-2xl font-black uppercase text-[#d38b54]">No meal service today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {([
              { key: "Breakfast", label: "Breakfast" },
              { key: "Lunch", label: "Lunch" },
              { key: "Snack", label: "Snacks" },
            ] as const).map(({ key, label }) => {
              const items = todayPlan.meals[key].items;

              return (
                <section key={key} className="relative rounded-[1.75rem] border border-[#d38b54] bg-[#fffde9] px-5 pb-6 pt-12 min-h-[420px]">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#ffd34a] px-8 py-3 text-sm font-black uppercase shadow-sm">
                    {label}
                  </div>

                  <div className="space-y-5">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <div key={`${key}-${index}-${item.name}`} className="border-b border-black/70 pb-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xl font-black lowercase leading-tight text-black">{item.name}</p>
                              {item.allergens && (
                                <p className="mt-1 text-sm italic text-black/80">Allergens: {item.allergens}</p>
                              )}
                              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                {item.pax} servings planned
                              </p>
                            </div>
                            <p className="text-2xl font-black text-black">
                              ₱{Number(item.perPersonPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Per person</p>
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

        <div className="mt-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
            Current saved menu from the approved daily meal plan
          </p>
        </div>
      </div>
    </div>
  );
}
