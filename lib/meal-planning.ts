"use client";

export type MealType = "Breakfast" | "Lunch" | "Snack";
export type StatusType = "NOW SERVING" | "COOKING" | "PREPARING" | "NOT YET STARTED";
const WEEKLY_BUDGET_STORAGE_KEY = "stockmate-weekly-budget";

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

export interface InventoryPriceLookupItem {
  id?: number | null;
  item?: string;
  price?: number;
  qty?: number;
  threshold?: number;
  unit?: string;
}

export type ProcurementMode = "minimum_purchase" | "maintain_stock_level";

export interface ProcurementSummary {
  inventoryCoverage: number;
  totalRecipeCost: number;
  estimatedProcurementCost: number;
  expectedRevenue: number;
  estimatedProfit: number;
}

export interface InventoryUsageEntry {
  inventoryId?: number | null;
  itemName: string;
  normalizedName: string;
  unit: string;
  requiredQty: number;
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
  createdByRole?: string;
  updatedAt?: string;
}

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizeTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export function formatLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function formatDateInputValue(value?: string) {
  if (!value) return "";
  const parsed = parseLocalDateKey(value) ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

export function parseDateInputValue(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return formatLocalDateKey(parsed);
}

function getCurrentWeekBudgetKey() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);
  return formatLocalDateKey(monday);
}

export function readStoredWeeklyBudget() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(WEEKLY_BUDGET_STORAGE_KEY);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as { weekKey?: string; value?: number };
    const currentWeekKey = getCurrentWeekBudgetKey();
    if (parsed.weekKey !== currentWeekKey) return 0;
    const value = Number(parsed.value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    const legacyValue = Number(raw);
    return Number.isFinite(legacyValue) && legacyValue >= 0 ? legacyValue : 0;
  }
}

export function saveStoredWeeklyBudget(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WEEKLY_BUDGET_STORAGE_KEY,
    JSON.stringify({
      weekKey: getCurrentWeekBudgetKey(),
      value,
    })
  );
}

export function createEmptyDayPlan(date: Date, previous?: DayPlan): DayPlan {
  return {
    date: formatDisplayDate(date),
    dayName: date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
    isoDate: formatLocalDateKey(date),
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
    const parsed = parseLocalDateKey(rawDate) ?? new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) return formatLocalDateKey(parsed);
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

function parsePlanDataSource(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function deriveDateRangeFromDayPlans(planData: DayPlan[]) {
  const dates = planData
    .map((day) => String(day.isoDate || "").trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  return {
    from: dates[0] ?? "",
    to: dates[dates.length - 1] ?? "",
  };
}

function extractPlanDataCandidate(raw: unknown): unknown {
  if (!raw) return null;
  const parsedRaw = parsePlanDataSource(raw);
  if (Array.isArray(parsedRaw)) return parsedRaw;

  if (typeof parsedRaw === "object") {
    const record = parsedRaw as Record<string, unknown>;

    const planData = parsePlanDataSource(record.plan_data);
    if (Array.isArray(planData)) return planData;

    const camelPlanData = parsePlanDataSource(record.planData);
    if (Array.isArray(camelPlanData)) return camelPlanData;

    if ("data" in record) return extractPlanDataCandidate(record.data);
  }

  return null;
}

export function createPlansFromRange(dateFrom: string, dateTo: string, existingPlans: DayPlan[] = []): DayPlan[] {
  const start = parseLocalDateKey(dateFrom) ?? new Date(dateFrom);
  const end = parseLocalDateKey(dateTo) ?? new Date(dateTo);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const previousByIso = new Map(existingPlans.map((plan) => [plan.isoDate, plan]));
  const plans: DayPlan[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const snapshot = new Date(cursor);
    const isoDate = formatLocalDateKey(snapshot);
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

function normalizeRecipeLookupName(value: string) {
  return value.trim().toLowerCase();
}

export function buildInventoryPriceLookups(items: InventoryPriceLookupItem[]) {
  return {
    inventoryById: new Map(
      items
        .filter((item): item is Required<Pick<InventoryPriceLookupItem, "id">> & InventoryPriceLookupItem => {
          return item.id !== undefined && item.id !== null && Number.isFinite(Number(item.id));
        })
        .map((item) => [Number(item.id), item])
    ),
    inventoryByName: new Map(
      items
        .filter((item): item is InventoryPriceLookupItem & { item: string } => typeof item.item === "string" && item.item.trim().length > 0)
        .map((item) => [normalizeRecipeLookupName(item.item), item])
    ),
  };
}

export function syncPlannedMealItemWithRecipes(
  item: PlannedMealItem,
  recipes: PlannerRecipe[]
): PlannedMealItem {
  const matchedRecipe =
    recipes.find((recipe) => item.recipeId !== undefined && recipe.id === item.recipeId) ??
    recipes.find((recipe) => normalizeRecipeLookupName(recipe.name) === normalizeRecipeLookupName(item.name));

  if (!matchedRecipe) return item;

  return {
    ...item,
    name: matchedRecipe.name,
    recipeId: item.recipeId ?? matchedRecipe.id,
    category: item.category ?? matchedRecipe.category,
    basePax: item.basePax ?? matchedRecipe.paxSize,
    allergens: item.allergens ?? matchedRecipe.allergens,
    price: item.price ?? matchedRecipe.price,
    ingredients: item.ingredients ?? matchedRecipe.ingredients,
  };
}

export function syncDayPlansWithRecipes(dayPlans: DayPlan[], recipes: PlannerRecipe[]): DayPlan[] {
  if (recipes.length === 0) return dayPlans;

  return dayPlans.map((day) => ({
    ...day,
    meals: {
      Breakfast: {
        ...day.meals.Breakfast,
        items: day.meals.Breakfast.items.map((item) => syncPlannedMealItemWithRecipes(item, recipes)),
      },
      Lunch: {
        ...day.meals.Lunch,
        items: day.meals.Lunch.items.map((item) => syncPlannedMealItemWithRecipes(item, recipes)),
      },
      Snack: {
        ...day.meals.Snack,
        items: day.meals.Snack.items.map((item) => syncPlannedMealItemWithRecipes(item, recipes)),
      },
    },
  }));
}

export function syncMealPlanRecordsWithRecipes(records: MealPlanRecord[], recipes: PlannerRecipe[]): MealPlanRecord[] {
  if (recipes.length === 0) return records;

  return records.map((record) => ({
    ...record,
    planData: syncDayPlansWithRecipes(record.planData, recipes),
  }));
}

export function estimateItemCost(
  item: PlannedMealItem,
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  const manualCost = Number(item.manualCostPerServing ?? 0);
  if (manualCost > 0 && item.pax > 0) {
    return manualCost * item.pax;
  }

  const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  if (ingredients.length === 0) {
    return 0;
  }

  const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
  const multiplier = item.pax > 0 ? item.pax / basePax : 0;

  const ingredientCost = ingredients.reduce((sum, ingredient) => {
    const ingredientName = ingredient.itemName || ingredient.name || "";
    const matchedInventory =
      (ingredient.inventoryId ? lookups?.inventoryById.get(Number(ingredient.inventoryId)) : undefined) ??
      (ingredientName ? lookups?.inventoryByName.get(normalizeRecipeLookupName(ingredientName)) : undefined);
    const unitPrice = Number(matchedInventory?.price ?? ingredient.avgPrice ?? 0);
    const quantity = Number(ingredient.qty ?? 0);
    return sum + quantity * multiplier * unitPrice;
  }, 0);

  return ingredientCost;
}

export function estimateItemRevenue(item: PlannedMealItem) {
  return Number(item.price ?? 0) * Number(item.pax ?? 0);
}

export function estimateItemProfit(
  item: PlannedMealItem,
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  return estimateItemRevenue(item) - estimateItemCost(item, lookups);
}

export function estimateMealTypeCost(
  day: DayPlan,
  mealType: MealType,
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  return day.meals[mealType].items.reduce((sum, item) => sum + estimateItemCost(item, lookups), 0);
}

export function estimateItemPerPersonCost(
  item: PlannedMealItem,
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  const manualCost = Number(item.manualCostPerServing ?? 0);
  if (manualCost > 0) {
    return manualCost;
  }

  const totalCost = estimateItemCost(item, lookups);
  if (totalCost > 0 && item.pax > 0) {
    return totalCost / item.pax;
  }

  return 0;
}

export function estimatePlanCost(
  plans: DayPlan[],
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  return plans.reduce((total, day) => {
    if (day.isHoliday) return total;
    return (
      total +
      MEAL_TYPES.reduce((dayTotal, mealType) => {
        return dayTotal + day.meals[mealType].items.reduce((sum, item) => sum + estimateItemCost(item, lookups), 0);
      }, 0)
    );
  }, 0);
}

export function estimatePlanRevenue(plans: DayPlan[]) {
  return plans.reduce((total, day) => {
    if (day.isHoliday) return total;
    return (
      total +
      MEAL_TYPES.reduce((dayTotal, mealType) => {
        return dayTotal + day.meals[mealType].items.reduce((sum, item) => sum + estimateItemRevenue(item), 0);
      }, 0)
    );
  }, 0);
}

export function estimatePlanProfit(
  plans: DayPlan[],
  lookups?: ReturnType<typeof buildInventoryPriceLookups>
) {
  return estimatePlanRevenue(plans) - estimatePlanCost(plans, lookups);
}

export function computeMealPlanUsageForDate(
  plan: MealPlanRecord,
  isoDate: string
): InventoryUsageEntry[] {
  const targetDay = plan.planData.find((day) => day.isoDate === isoDate);
  if (!targetDay || targetDay.isHoliday) return [];

  const usage = new Map<string, InventoryUsageEntry>();

  MEAL_TYPES.forEach((mealType) => {
    targetDay.meals[mealType].items.forEach((item) => {
      const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
      const multiplier = item.pax > 0 ? item.pax / basePax : 0;

      (item.ingredients ?? []).forEach((ingredient) => {
        const itemName = String(ingredient.itemName || ingredient.name || "Unknown Ingredient").trim();
        const normalizedName = normalizeRecipeLookupName(itemName);
        const inventoryId =
          ingredient.inventoryId === undefined || ingredient.inventoryId === null
            ? null
            : Number(ingredient.inventoryId);
        const unit = String(ingredient.unit ?? "").trim();
        const requiredQty = Number(ingredient.qty ?? 0) * multiplier;
        const key = inventoryId && inventoryId > 0 ? `id:${inventoryId}` : `name:${normalizedName}::${unit}`;

        const current = usage.get(key);
        if (current) {
          current.requiredQty += requiredQty;
        } else {
          usage.set(key, {
            inventoryId,
            itemName,
            normalizedName,
            unit,
            requiredQty,
          });
        }
      });
    });
  });

  return Array.from(usage.values());
}

export function computeProcurementSummary(
  plan: MealPlanRecord,
  inventoryItems: InventoryPriceLookupItem[],
  procurementMode: ProcurementMode
): ProcurementSummary {
  const inventoryLookups = buildInventoryPriceLookups(inventoryItems);
  const inventoryById = new Map(inventoryItems.map((item) => [Number(item.id), item]));
  const inventoryByName = new Map(
    inventoryItems
      .filter((item): item is InventoryPriceLookupItem & { item: string } => typeof item.item === "string" && item.item.trim().length > 0)
      .map((item) => [normalizeRecipeLookupName(item.item), item])
  );
  const ingredientTotals = new Map<
    string,
    {
      requiredQty: number;
      availableQty: number;
      thresholdQty: number;
      unitPrice: number;
    }
  >();

  let totalRecipeCost = 0;
  let expectedRevenue = 0;

  plan.planData.forEach((day) => {
    if (day.isHoliday) return;

    MEAL_TYPES.forEach((mealType) => {
      day.meals[mealType].items.forEach((item) => {
        totalRecipeCost += estimateItemCost(item, inventoryLookups);
        expectedRevenue += estimateItemRevenue(item);

        const basePax = item.basePax && item.basePax > 0 ? item.basePax : item.pax || 1;
        const multiplier = item.pax > 0 ? item.pax / basePax : 0;

        (item.ingredients ?? []).forEach((ingredient) => {
          const ingredientName = ingredient.itemName || ingredient.name || "Unknown Ingredient";
          const matchedInventory =
            (ingredient.inventoryId ? inventoryById.get(Number(ingredient.inventoryId)) : undefined) ??
            inventoryByName.get(normalizeRecipeLookupName(ingredientName));
          const requiredQty = Number(ingredient.qty ?? 0) * multiplier;
          const availableQty = Number(matchedInventory?.qty ?? 0);
          const thresholdQty = Number(matchedInventory?.threshold ?? 0);
          const unitPrice = Number(matchedInventory?.price ?? ingredient.avgPrice ?? 0);
          const key = `${normalizeRecipeLookupName(ingredientName)}::${ingredient.unit ?? matchedInventory?.unit ?? ""}`;

          const current = ingredientTotals.get(key);
          if (current) {
            current.requiredQty += requiredQty;
            current.availableQty = Math.max(current.availableQty, availableQty);
            current.thresholdQty = Math.max(current.thresholdQty, thresholdQty);
            current.unitPrice = current.unitPrice || unitPrice;
          } else {
            ingredientTotals.set(key, {
              requiredQty,
              availableQty,
              thresholdQty,
              unitPrice,
            });
          }
        });
      });
    });
  });

  const totals = Array.from(ingredientTotals.values()).reduce(
    (summary, entry) => {
      const coveredQty = Math.max(0, Math.min(entry.requiredQty, entry.availableQty));
      const procurementTarget =
        procurementMode === "maintain_stock_level"
          ? entry.requiredQty + entry.thresholdQty
          : entry.requiredQty;
      const procurementQty = Math.max(0, procurementTarget - entry.availableQty);

      summary.requiredQty += entry.requiredQty;
      summary.coveredQty += coveredQty;
      summary.estimatedProcurementCost += procurementQty * entry.unitPrice;
      return summary;
    },
    { requiredQty: 0, coveredQty: 0, estimatedProcurementCost: 0 }
  );

  return {
    inventoryCoverage: totals.requiredQty > 0 ? (totals.coveredQty / totals.requiredQty) * 100 : 0,
    totalRecipeCost,
    estimatedProcurementCost: totals.estimatedProcurementCost,
    expectedRevenue,
    estimatedProfit: expectedRevenue - totalRecipeCost,
  };
}

export function normalizeMealPlanRecord(raw: unknown): MealPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = Number(record.id);
  if (!Number.isFinite(id)) return null;

  const planData = normalizeDayPlans(extractPlanDataCandidate(record));

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
    createdByRole: String(record.created_by_role ?? record.createdByRole ?? ""),
    updatedAt: String(record.updated_at ?? record.updatedAt ?? ""),
  };
}

export function normalizeMealPlanRecords(raw: unknown): MealPlanRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMealPlanRecord)
    .filter((record): record is MealPlanRecord => record !== null);
}

export function normalizeActiveMealPlanPayload(raw: unknown): MealPlanRecord[] {
  const normalizedRecords = normalizeMealPlanRecords(raw);
  if (normalizedRecords.length > 0) return normalizedRecords;

  const planDataCandidate = extractPlanDataCandidate(raw);
  const planData = normalizeDayPlans(planDataCandidate);
  if (planData.length === 0) return [];

  const source = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  const dateRange = deriveDateRangeFromDayPlans(planData);
  const resolvedId = Number(source.id ?? source.meal_plan_id ?? source.mealPlanId ?? 0);

  return [
    {
      id: Number.isFinite(resolvedId) ? resolvedId : 0,
      dateFrom: String(source.date_from ?? source.dateFrom ?? dateRange.from),
      dateTo: String(source.date_to ?? source.dateTo ?? dateRange.to),
      status: String(source.status ?? source.plan_status ?? "approved"),
      planData,
      estimatedBudget:
        source.estimated_budget === undefined && source.estimatedBudget === undefined
          ? undefined
          : Number(source.estimated_budget ?? source.estimatedBudget ?? 0),
      createdById:
        source.created_by_id === undefined && source.createdById === undefined
          ? undefined
          : Number(source.created_by_id ?? source.createdById ?? 0),
      createdByName: String(source.created_by_name ?? source.createdByName ?? ""),
      createdByRole: String(source.created_by_role ?? source.createdByRole ?? ""),
      updatedAt: String(source.updated_at ?? source.updatedAt ?? ""),
    },
  ];
}

export function normalizePlanStatus(status: string) {
  const value = status.trim().toLowerCase();
  if (value === "published" || value === "approved" || value === "ongoing") return "approved";
  if (value === "pending" || value === "draft") return "pending";
  if (value === "rejected" || value === "denied") return "rejected";
  if (value === "done" || value === "completed") return "completed";
  return value || "pending";
}
