"use client";

export type MealType = "Breakfast" | "Lunch" | "Snack";
export type StatusType = "NOW SERVING" | "COOKING" | "PREPARING" | "NOT YET STARTED";

export interface RecipeIngredient {
  inventoryId?: number | null;
  itemName?: string;
  name?: string;
  qty: number;
  unit: string;
  avgPrice?: number;
}

export interface PlannerRecipe {
  id: number;
  name: string;
  category: MealType;
  paxSize: number;
  allergens: string;
  price?: number;
  ingredients: RecipeIngredient[];
}

export interface PlannedMealItem {
  id: string;
  name: string;
  pax: number;
  recipeId?: number;
  category?: MealType;
  basePax?: number;
  allergens?: string;
  price?: number;
  ingredients?: RecipeIngredient[];
  manualCostPerServing?: number;
}

export interface MealCategoryPlan {
  status: StatusType;
  items: PlannedMealItem[];
}

export interface DayPlan {
  date: string;
  dayName: string;
  isoDate: string;
  isHoliday: boolean;
  meals: Record<MealType, MealCategoryPlan>;
}

export interface MealPlanRecord {
  id: number;
  dateFrom: string;
  dateTo: string;
  status: string;
  planData: DayPlan[];
  estimatedBudget?: number;
  createdById?: number;
  createdByName?: string;
  updatedAt?: string;
}

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizeMealType(value: unknown): MealType | null {
  if (typeof value !== "string") return null;
  const normalized = titleCase(value.trim());
  return MEAL_TYPES.includes(normalized as MealType) ? (normalized as MealType) : null;
}

export function normalizeRecipe(raw: unknown): PlannerRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const recipe = raw as Record<string, unknown>;
  const category = normalizeMealType(recipe.category);
  if (!category) return null;

  const id = Number(recipe.id);
  const paxSize = Number(recipe.paxSize ?? recipe.pax_size ?? 0);
  const ingredients = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as RecipeIngredient[]).map((ingredient) => ({
        inventoryId:
          ingredient.inventoryId === undefined || ingredient.inventoryId === null
            ? null
            : Number(ingredient.inventoryId),
        itemName: ingredient.itemName ?? ingredient.name ?? "",
        name: ingredient.name ?? ingredient.itemName ?? "",
        qty: Number(ingredient.qty ?? 0),
        unit: ingredient.unit ?? "",
        avgPrice: ingredient.avgPrice === undefined ? undefined : Number(ingredient.avgPrice),
      }))
    : [];

  if (!Number.isFinite(id) || !recipe.name || !Number.isFinite(paxSize)) return null;

  return {
    id,
    name: String(recipe.name),
    category,
    paxSize,
    allergens: String(recipe.allergens ?? ""),
    price:
      recipe.price === undefined || recipe.price === null
        ? undefined
        : Number(recipe.price),
    ingredients,
  };
}

export function normalizeRecipes(raw: unknown): PlannerRecipe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeRecipe)
    .filter((recipe): recipe is PlannerRecipe => recipe !== null);
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function createEmptyDayPlan(date: Date, previous?: DayPlan): DayPlan {
  return {
    date: formatDisplayDate(date),
    dayName: date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
    isoDate: date.toISOString().slice(0, 10),
    isHoliday: previous?.isHoliday ?? false,
    meals: {
      Breakfast: previous?.meals.Breakfast ?? { status: "NOT YET STARTED", items: [] },
      Lunch: previous?.meals.Lunch ?? { status: "NOT YET STARTED", items: [] },
      Snack: previous?.meals.Snack ?? { status: "NOT YET STARTED", items: [] },
    },
  };
}

function deriveIsoDate(raw: Record<string, unknown>, fallbackIndex = 0) {
  const rawIso = raw.isoDate;
  if (typeof rawIso === "string" && rawIso.trim()) return rawIso;

  const rawDate = raw.date;
  if (typeof rawDate === "string" && rawDate.trim()) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  return `plan-day-${fallbackIndex}`;
}

function normalizeMealCategoryPlan(raw: unknown): MealCategoryPlan {
  if (!raw || typeof raw !== "object") {
    return { status: "NOT YET STARTED", items: [] };
  }

  const category = raw as Record<string, unknown>;
  return {
    status: (typeof category.status === "string" && category.status.trim()
      ? category.status
      : "NOT YET STARTED") as StatusType,
    items: Array.isArray(category.items) ? (category.items as PlannedMealItem[]) : [],
  };
}

function normalizeDayPlan(raw: unknown, index: number): DayPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const meals = (record.meals ?? {}) as Record<string, unknown>;

  return {
    date: String(record.date ?? ""),
    dayName: String(record.dayName ?? ""),
    isoDate: deriveIsoDate(record, index),
    isHoliday: Boolean(record.isHoliday),
    meals: {
      Breakfast: normalizeMealCategoryPlan(meals.Breakfast),
      Lunch: normalizeMealCategoryPlan(meals.Lunch),
      Snack: normalizeMealCategoryPlan(meals.Snack),
    },
  };
}

function normalizeDayPlans(raw: unknown): DayPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => normalizeDayPlan(entry, index))
    .filter((plan): plan is DayPlan => plan !== null);
}

export function createPlansFromRange(dateFrom: string, dateTo: string, existingPlans: DayPlan[] = []): DayPlan[] {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const previousByIso = new Map(existingPlans.map((plan) => [plan.isoDate, plan]));
  const plans: DayPlan[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const snapshot = new Date(cursor);
    const isoDate = snapshot.toISOString().slice(0, 10);
    plans.push(createEmptyDayPlan(snapshot, previousByIso.get(isoDate)));
  }

  return plans;
}

export function buildPlannedMealItem(recipe: PlannerRecipe): PlannedMealItem {
  return {
    id: `${recipe.category}-${recipe.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: recipe.name,
    pax: recipe.paxSize,
    recipeId: recipe.id,
    category: recipe.category,
    basePax: recipe.paxSize,
    allergens: recipe.allergens,
    price: recipe.price,
    ingredients: recipe.ingredients,
    manualCostPerServing: undefined,
  };
}

export function estimateItemCost(item: PlannedMealItem) {
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
  const multiplier = item.pax > 0 ? item.pax / basePax : 0;

  return ingredients.reduce((sum, ingredient) => {
    const unitPrice = Number(ingredient.avgPrice ?? 0);
    const quantity = Number(ingredient.qty ?? 0);
    return sum + quantity * multiplier * unitPrice;
  }, 0);
}

export function estimateItemPerPersonCost(item: PlannedMealItem) {
  const manualCost = Number(item.manualCostPerServing ?? 0);
  if (manualCost > 0) {
    return manualCost;
  }

  const totalCost = estimateItemCost(item);
  if (totalCost > 0 && item.pax > 0) {
    return totalCost / item.pax;
  }

  const recipePrice = Number(item.price ?? 0);
  const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
  if (recipePrice > 0 && basePax > 0) {
    return recipePrice / basePax;
  }

  return 0;
}

export function estimatePlanCost(plans: DayPlan[]) {
  return plans.reduce((total, day) => {
    if (day.isHoliday) return total;
    return (
      total +
      MEAL_TYPES.reduce((dayTotal, mealType) => {
        return dayTotal + day.meals[mealType].items.reduce((sum, item) => sum + estimateItemCost(item), 0);
      }, 0)
    );
  }, 0);
}

export function normalizeMealPlanRecord(raw: unknown): MealPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = Number(record.id);
  if (!Number.isFinite(id)) return null;

  const planData = normalizeDayPlans(record.plan_data);

  return {
    id,
    dateFrom: String(record.date_from ?? record.dateFrom ?? ""),
    dateTo: String(record.date_to ?? record.dateTo ?? ""),
    status: String(record.status ?? "UNKNOWN"),
    planData,
    estimatedBudget:
      record.estimated_budget === undefined && record.estimatedBudget === undefined
        ? undefined
        : Number(record.estimated_budget ?? record.estimatedBudget ?? 0),
    createdById:
      record.created_by_id === undefined && record.createdById === undefined
        ? undefined
        : Number(record.created_by_id ?? record.createdById ?? 0),
    createdByName: String(record.created_by_name ?? record.createdByName ?? ""),
    updatedAt: String(record.updated_at ?? record.updatedAt ?? ""),
  };
}

export function normalizeMealPlanRecords(raw: unknown): MealPlanRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMealPlanRecord)
    .filter((record): record is MealPlanRecord => record !== null);
}

export function normalizePlanStatus(status: string) {
  const value = status.trim().toLowerCase();
  if (value === "published" || value === "approved" || value === "ongoing") return "approved";
  if (value === "pending" || value === "draft") return "pending";
  if (value === "rejected" || value === "denied") return "rejected";
  if (value === "done" || value === "completed") return "completed";
  return value || "pending";
}
