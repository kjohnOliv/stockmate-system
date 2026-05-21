"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, CheckSquare, ClipboardCheck, Eye, ExternalLink, Pencil, Plus, Send, ShieldCheck, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import MealPlanPreviewDialog from "@/components/meal-plan/MealPlanPreviewDialog";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { ApiClient, isAccessDeniedError, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import { persistPurchaseHandoff } from "@/lib/purchase-handoff";
import { buildInventoryPriceLookups, buildPlannedMealItem, computeMealPlanUsageForDate, computeProcurementSummary, createPlansFromRange, DayPlan, estimateItemCost, estimateItemPerPersonCost, estimateMealTypeCost, estimatePlanCost, formatDateInputValue, formatLocalDateKey, MealPlanRecord, MealType, normalizeActiveMealPlanPayload, normalizeMealPlanRecords, normalizePlanStatus, normalizeRecipes, PlannerRecipe, readStoredWeeklyBudget, saveStoredWeeklyBudget, syncMealPlanRecordsWithRecipes } from "@/lib/meal-planning";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";

type ViewMode = "list" | "editor";
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

interface InventoryItem {
  id: number;
  item: string;
  category?: string;
  threshold?: number;
  unit?: string;
  qty?: number;
  price?: number;
}

interface PlanOwnerUser {
  id: number;
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
  requested_role?: string;
}

type StoredMealPlanCreator = {
  createdById?: number;
  createdByName?: string;
  createdByRole?: string;
};

const MEAL_PLAN_CREATORS_STORAGE_KEY = "stockmate-meal-plan-creators";

function readStoredMealPlanCreators() {
  if (typeof window === "undefined") return {} as Record<string, StoredMealPlanCreator>;

  try {
    const raw = window.localStorage.getItem(MEAL_PLAN_CREATORS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredMealPlanCreator>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredMealPlanCreator(planId: number, creator: StoredMealPlanCreator) {
  if (typeof window === "undefined" || !Number.isFinite(planId) || planId <= 0) return;
  const current = readStoredMealPlanCreators();
  current[String(planId)] = creator;
  window.localStorage.setItem(MEAL_PLAN_CREATORS_STORAGE_KEY, JSON.stringify(current));
}

function applyStoredMealPlanCreators(records: MealPlanRecord[]) {
  const storedCreators = readStoredMealPlanCreators();
  return records.map((record) => {
    const fallbackCreator = storedCreators[String(record.id)];
    if (!fallbackCreator) return record;

    return {
      ...record,
      createdById: record.createdById || fallbackCreator.createdById,
      createdByName: record.createdByName?.trim() ? record.createdByName : fallbackCreator.createdByName,
      createdByRole: record.createdByRole?.trim() ? record.createdByRole : fallbackCreator.createdByRole,
    };
  });
}

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  return { from: formatLocalDateKey(start), to: formatLocalDateKey(end) };
}

function getRecipesForType(recipes: PlannerRecipe[], mealType: MealType) {
  return recipes.filter((recipe) => recipe.category === mealType);
}

function formatStatus(status: string) {
  return normalizePlanStatus(status).replace(/_/g, " ").toUpperCase();
}

function formatSubmissionState(status: string) {
  const normalized = normalizePlanStatus(status);
  if (normalized === "approved") return "Accepted";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "pending") return "Pending";
  return formatStatus(status);
}

function statusClassName(status: string) {
  switch (normalizePlanStatus(status)) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function isPastPlan(plan: MealPlanRecord) {
  const today = formatLocalDateKey();
  return Boolean(plan.dateTo && plan.dateTo < today);
}

function getOwnerLabel(
  plan: MealPlanRecord,
  ownerLookup: Map<number, PlanOwnerUser>,
  currentUser?: { id?: number; full_name?: string; username?: string; role?: string } | null,
  options?: { preferAdminHandoffLabel?: boolean }
) {
  const matchedOwner =
    (plan.createdById ? ownerLookup.get(plan.createdById) : undefined) ??
    (currentUser?.id && plan.createdById === currentUser.id
      ? {
          id: Number(currentUser.id),
          full_name: currentUser.full_name,
          username: currentUser.username,
          role: currentUser.role,
        }
      : undefined);

  const rawOwnerRole = plan.createdByRole?.trim() || "";
  const isGenericOwnerRole = rawOwnerRole.toLowerCase() === "unspecified role";
  const ownerRoleRaw =
    (!isGenericOwnerRole ? rawOwnerRole : "") ||
    matchedOwner?.role?.trim() ||
    matchedOwner?.requested_role?.trim() ||
    "";

  const ownerRole = ownerRoleRaw
    ? ownerRoleRaw.toLowerCase()
    : "";
  const username = matchedOwner?.username?.trim() || "";
  const rawOwnerName = plan.createdByName?.trim() || "";
  const isGenericOwnerName = rawOwnerName.toLowerCase() === "system";
  const fallbackName = (!isGenericOwnerName ? rawOwnerName : "") || matchedOwner?.full_name?.trim() || matchedOwner?.email?.trim() || "";

  if (username && ownerRole) return `${ownerRole} @${username}`;
  if (username) return `@${username}`;
  if (ownerRole) return ownerRole;
  if (fallbackName) return fallbackName;
  if (options?.preferAdminHandoffLabel && normalizePlanStatus(plan.status) === "approved") return "Admin handoff";
  return "Unassigned";
}

function buildMealPlanMutationPayload(dateFrom: string, dateTo: string, planData: DayPlan[], status: string) {
  return {
    date_from: dateFrom,
    date_to: dateTo,
    status,
    plan_data: planData,
  };
}

async function extractCreatedMealPlanId(response: Response) {
  try {
    const createResult = await response.json();
    return Number(
      createResult?.data?.id ??
        createResult?.id ??
        createResult?.meal_plan_id ??
        createResult?.data?.meal_plan_id ??
        0
    );
  } catch {
    return 0;
  }
}

async function loadMealPlanRecordsForStaff() {
  try {
    const response = await ApiClient.get("/api/meal-plans");
    const result = await response.json();
    const list = result?.success ? result.data : result?.data ?? result;
    return applyStoredMealPlanCreators(normalizeMealPlanRecords(list));
  } catch (error) {
    if (!isAccessDeniedError(error)) throw error;

    const response = await ApiClient.get("/api/meal-plans/active");
    const result = await response.json();
    const activePlanSource = result?.data ?? result;
    return applyStoredMealPlanCreators(normalizeActiveMealPlanPayload(activePlanSource));
  }
}

function isRiceMealRecipe(recipe: PlannerRecipe) {
  return /\brice meal\b/i.test(recipe.name) || /\brice\b/i.test(recipe.name);
}

function hasRiceMeal(items: { name: string }[]) {
  return items.some((item) => /\brice meal\b/i.test(item.name) || /\brice\b/i.test(item.name));
}

function addAutomaticRiceMeals(planData: DayPlan[], recipes: PlannerRecipe[]) {
  let addedCount = 0;

  const nextPlanData = planData.map((day) => {
    if (day.isHoliday) return day;

    const nextMeals = { ...day.meals };

    MEAL_TYPES.forEach((mealType) => {
      const existingItems = nextMeals[mealType].items;
      if (existingItems.length === 0 || hasRiceMeal(existingItems)) return;

      const riceRecipe =
        recipes.find((recipe) => recipe.category === mealType && /\brice meal\b/i.test(recipe.name)) ??
        recipes.find((recipe) => recipe.category === mealType && isRiceMealRecipe(recipe));

      if (!riceRecipe) return;

      const totalPax = existingItems.reduce((sum, item) => sum + Math.max(0, Number(item.pax ?? 0)), 0);
      if (totalPax <= 0) return;

      const riceItem = buildPlannedMealItem(riceRecipe);
      riceItem.pax = totalPax;

      nextMeals[mealType] = {
        ...nextMeals[mealType],
        items: [...existingItems, riceItem],
      };
      addedCount += 1;
    });

    return {
      ...day,
      meals: nextMeals,
    };
  });

  return { nextPlanData, addedCount };
}

function MealPlannerContent() {
  const PLANS_PER_PAGE = 5;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAdmin, isCook, isStaff } = useAuth();
  const { refreshVersions } = useNotifications();
  const pathnameFilter = pathname === "/meal-plan/current" ? "current" : pathname === "/meal-plan/past" ? "past" : null;
  const planFilter = searchParams.get("view") ?? pathnameFilter;
  const [view, setView] = useState<ViewMode>("list");
  const [dateRange, setDateRange] = useState(getCurrentWeekRange);
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<MealPlanRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [planOwnerUsers, setPlanOwnerUsers] = useState<PlanOwnerUser[]>([]);
  const [mealDirectory, setMealDirectory] = useState<PlannerRecipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [previewPlan, setPreviewPlan] = useState<MealPlanRecord | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState(0);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [weeklyBudgetDraft, setWeeklyBudgetDraft] = useState("");
  const [plansPage, setPlansPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(isStaff ? "approved" : "all");
  const [editorStatus, setEditorStatus] = useState("pending");
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" | "warning" | "info" }>({ open: false, title: "", message: "", variant: "info" });
  const [approvedHandoffPlan, setApprovedHandoffPlan] = useState<MealPlanRecord | null>(null);
  const [handoffCashDraft, setHandoffCashDraft] = useState("");
  const [handoffNotesDraft, setHandoffNotesDraft] = useState("");
  const [handoffWarningMessage, setHandoffWarningMessage] = useState("");
  const [isSavingHandoff, setIsSavingHandoff] = useState(false);
  const handoffCashInputRef = useRef<HTMLInputElement | null>(null);
  const handoffNotesInputRef = useRef<HTMLTextAreaElement | null>(null);
  const canAdminReview = isAdmin;
  const canCookCreate = isCook;
  const isStaffChecklistView = isStaff && !isAdmin && !isCook;

  const formatCurrency = (value: number) => `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  useEffect(() => {
    const storedBudget = readStoredWeeklyBudget();
    setWeeklyBudget(storedBudget);
    setWeeklyBudgetDraft(storedBudget > 0 ? String(storedBudget) : "");
  }, []);

  useEffect(() => {
    setPlans((current) => createPlansFromRange(dateRange.from, dateRange.to, current));
  }, [dateRange]);

  useEffect(() => {
    const loadRecipes = async () => {
      if (isStaff) {
        setMealDirectory([]);
        setIsLoadingRecipes(false);
        return;
      }
      setIsLoadingRecipes(true);
      try {
        const response = await ApiClient.get("/api/recipes");
        const result = await response.json();
        setMealDirectory(normalizeRecipes(result?.success ? result.data : result?.data ?? result));
      } catch {
        setMealDirectory([]);
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    const loadSavedPlans = async () => {
      setIsLoadingPlans(true);
      try {
        let resolvedPlans: MealPlanRecord[] = [];

        if (isStaff) {
          resolvedPlans = await loadMealPlanRecordsForStaff();
        }

        const requests: Promise<Response>[] = [isStaff ? Promise.resolve(new Response()) : ApiClient.get("/api/meal-plans")];
        if (!isStaff) requests.push(ApiClient.get("/api/inventory"));
        if (isAdmin) requests.push(ApiClient.get("/api/users"));

        const [response, inventoryResponse, usersResponse] = await Promise.all(requests);

        if (!isStaff) {
          const result = await response.json();
          const list = result?.success ? result.data : result?.data ?? result;
          resolvedPlans = applyStoredMealPlanCreators(normalizeMealPlanRecords(list));
        }

        setSavedPlans(resolvedPlans);

        if (inventoryResponse?.ok) {
          const inventoryResult = await inventoryResponse.json();
          const items = inventoryResult?.success ? inventoryResult.data : inventoryResult?.data ?? inventoryResult;
          setInventoryItems(Array.isArray(items) ? items : []);
        } else if (!isStaff) {
          setInventoryItems([]);
        }

        if (usersResponse?.ok) {
          const usersResult = await usersResponse.json();
          const users = usersResult?.success ? usersResult.data : usersResult?.data ?? usersResult;
          setPlanOwnerUsers(Array.isArray(users) ? users : []);
        } else if (isAdmin) {
          setPlanOwnerUsers([]);
        }
      } catch (error) {
        if (error instanceof Error && isPasswordChangeRequiredErrorMessage(error.message)) return;
        setSavedPlans([]);
        if (!isStaff) setInventoryItems([]);
        if (isAdmin) setPlanOwnerUsers([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    loadRecipes();
    loadSavedPlans();
  }, [isAdmin, isStaff, refreshVersions.inventory, refreshVersions.mealPlans, refreshVersions.users]);

  const refreshPlans = async () => {
    const resolvedPlans = isStaff
      ? await loadMealPlanRecordsForStaff()
      : await ApiClient.get("/api/meal-plans")
          .then((response) => response.json())
          .then((result) => applyStoredMealPlanCreators(normalizeMealPlanRecords(result?.success ? result.data : result?.data ?? result)));

    setSavedPlans(resolvedPlans);
    return resolvedPlans;
  };

  const displaySavedPlans = useMemo(() => syncMealPlanRecordsWithRecipes(savedPlans, mealDirectory), [savedPlans, mealDirectory]);
  const planOwnerLookup = useMemo(
    () => new Map(planOwnerUsers.map((entry) => [Number(entry.id), entry])),
    [planOwnerUsers]
  );
  const inventoryLookups = useMemo(() => buildInventoryPriceLookups(inventoryItems), [inventoryItems]);
  const totalCost = useMemo(() => estimatePlanCost(plans, inventoryLookups), [inventoryLookups, plans]);
  const isOverBudget = weeklyBudget > 0 && totalCost > weeklyBudget;
  const approvedHandoffSummary = useMemo(
    () =>
      approvedHandoffPlan
        ? computeProcurementSummary(approvedHandoffPlan, inventoryItems, "minimum_purchase")
        : null,
    [approvedHandoffPlan, inventoryItems]
  );

  const visiblePlans = useMemo(() => {
    const today = formatLocalDateKey();
    const sorted = [...displaySavedPlans].sort((a, b) => {
      const aIsCurrent = a.dateFrom <= today && a.dateTo >= today ? 1 : 0;
      const bIsCurrent = b.dateFrom <= today && b.dateTo >= today ? 1 : 0;
      if (aIsCurrent !== bIsCurrent) return bIsCurrent - aIsCurrent;
      return (b.dateFrom || "").localeCompare(a.dateFrom || "");
    });
    if (isAdmin) return sorted;
    if (isCook) {
      return sorted.filter((plan) => {
        if (plan.createdById && user?.id) return plan.createdById === user.id;
        if (plan.createdByName && user?.full_name) return plan.createdByName === user.full_name;
        return true;
      });
    }
    if (isStaff) return sorted.filter((plan) => normalizePlanStatus(plan.status) === "approved");
    return [];
  }, [displaySavedPlans, isAdmin, isCook, isStaff, user]);

  const filteredPlans = useMemo(() => {
    if (planFilter === "past") return visiblePlans.filter((plan) => isPastPlan(plan));
    if (planFilter === "current") return visiblePlans.filter((plan) => !isPastPlan(plan));
    return visiblePlans;
  }, [planFilter, visiblePlans]);

  const listPlans = useMemo(() => {
    if (statusFilter === "all") return filteredPlans;
    return filteredPlans.filter((plan) => normalizePlanStatus(plan.status) === statusFilter);
  }, [filteredPlans, statusFilter]);

  const totalPlanPages = Math.max(1, Math.ceil(listPlans.length / PLANS_PER_PAGE));
  const paginatedPlans = useMemo(
    () => listPlans.slice((plansPage - 1) * PLANS_PER_PAGE, plansPage * PLANS_PER_PAGE),
    [listPlans, plansPage]
  );

  useEffect(() => {
    setPlansPage(1);
  }, [planFilter, statusFilter]);

  useEffect(() => {
    if (plansPage > totalPlanPages) {
      setPlansPage(totalPlanPages);
    }
  }, [plansPage, totalPlanPages]);

  useEffect(() => {
    if (!approvedHandoffPlan) return;

    const focusTimer = window.setTimeout(() => {
      handoffCashInputRef.current?.focus();
      handoffCashInputRef.current?.select();
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [approvedHandoffPlan]);

  const handleStartEdit = (plan: MealPlanRecord) => {
    setEditingPlanId(plan.id);
    setDateRange({ from: plan.dateFrom, to: plan.dateTo });
    setPlans(plan.planData);
    setEditorStatus(plan.status);
    if (Number(plan.estimatedBudget ?? 0) > 0) {
      setWeeklyBudget(Number(plan.estimatedBudget));
    }
    setView("editor");
    setPreviewPlan(null);
  };

  const handleUpdateStatus = async (plan: MealPlanRecord, status: "approved" | "rejected") => {
    try {
      let effectivePlan = plan;
      let riceNotice = "";
      let inventoryNotice = "";
      const warningMessages: string[] = [];

      if (status === "approved") {
        try {
          const { nextPlanData, addedCount } = addAutomaticRiceMeals(plan.planData, mealDirectory);

          if (addedCount > 0) {
            await ApiClient.patch(
              `/api/meal-plans/${plan.id}`,
              buildMealPlanMutationPayload(plan.dateFrom, plan.dateTo, nextPlanData, plan.status)
            );
            effectivePlan = { ...plan, planData: nextPlanData };
            riceNotice = ` Added rice meal coverage to ${addedCount} meal schedule${addedCount === 1 ? "" : "s"}.`;
          }
        } catch {
          warningMessages.push("Automatic rice meal coverage could not be updated.");
        }
      }

      await ApiClient.patch(`/api/meal-plans/${plan.id}/status`, { status });

      if (status === "approved") {
        try {
          const today = formatLocalDateKey();
          const isCurrentApproval = effectivePlan.dateFrom <= today && effectivePlan.dateTo >= today;

          if (isCurrentApproval && inventoryItems.length > 0) {
            const usageEntries = computeMealPlanUsageForDate(effectivePlan, today);
            const inventoryById = new Map(inventoryItems.map((item) => [Number(item.id), item]));
            const inventoryByName = new Map(
              inventoryItems.map((item) => [String(item.item || "").trim().toLowerCase(), item])
            );

            const updates = usageEntries
              .map((entry) => {
                const matchedInventory =
                  (entry.inventoryId ? inventoryById.get(Number(entry.inventoryId)) : undefined) ??
                  inventoryByName.get(entry.normalizedName);

                if (!matchedInventory) return null;

                const currentQty = Number(matchedInventory.qty ?? 0);
                const nextQty = Math.max(0, currentQty - entry.requiredQty);

                return {
                  id: matchedInventory.id,
                  payload: {
                    ...matchedInventory,
                    qty: nextQty,
                  },
                };
              })
              .filter((update) => update !== null);

            if (updates.length > 0) {
              const results = await Promise.allSettled(
                updates.map((update) => ApiClient.put(`/api/inventory/${update!.id}`, update!.payload))
              );

              const succeeded = results.filter((result) => result.status === "fulfilled").length;
              if (succeeded > 0) {
                const inventoryResponse = await ApiClient.get("/api/inventory");
                const inventoryResult = await inventoryResponse.json();
                const items = inventoryResult?.success ? inventoryResult.data : inventoryResult?.data ?? inventoryResult;
                setInventoryItems(Array.isArray(items) ? items : []);
                inventoryNotice = ` Today's ingredient usage was applied to ${succeeded} inventory item${succeeded === 1 ? "" : "s"}.`;
              }

              if (succeeded !== updates.length) {
                warningMessages.push("Some inventory deductions could not be applied automatically.");
              }
            }
          }
        } catch {
          warningMessages.push("Inventory usage could not be synced automatically.");
        }
      }

      await refreshPlans();
      setPreviewPlan((current) => (current?.id === plan.id ? { ...effectivePlan, status } : current));
      const warningSuffix = warningMessages.length > 0 ? ` ${warningMessages.join(" ")}` : "";
      if (status === "approved") {
        setPreviewPlan(null);
        setApprovedHandoffPlan({ ...effectivePlan, status });
        setHandoffCashDraft("");
        setHandoffNotesDraft("");
        setHandoffWarningMessage(`${riceNotice}${inventoryNotice}${warningSuffix}`.trim());
      } else {
        setNotice({
          open: true,
          title: "Meal Plan Rejected",
          message: `Meal plan #${plan.id} is now ${status}.${warningSuffix}`,
          variant: "warning",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to update meal plan status.";
      setNotice({ open: true, title: "Action Failed", message, variant: "error" });
    }
  };

  const handleSaveWeeklyPlan = async () => {
    if (plans.length === 0) {
      setNotice({ open: true, title: "Missing Date Range", message: "Please select a valid date range before saving.", variant: "warning" });
      return;
    }
    const hasMeals = plans.some((day) => !day.isHoliday && MEAL_TYPES.some((type) => day.meals[type].items.length > 0));
    if (!hasMeals) {
      setNotice({ open: true, title: "No Meals Added", message: "Add at least one meal from the directory before saving the plan.", variant: "warning" });
      return;
    }
    setIsSaving(true);
    try {
      const currentCreator: StoredMealPlanCreator = {
        createdById: user?.id,
        createdByName: user?.full_name || user?.username || "",
        createdByRole: user?.role || user?.requested_role || "",
      };

      const createPlanSubmission = async (status: string, successMessage: string) => {
        const createResponse = await ApiClient.post(
          "/api/meal-plans",
          buildMealPlanMutationPayload(dateRange.from, dateRange.to, plans, status)
        );

        let createdPlanId = await extractCreatedMealPlanId(createResponse);
        const refreshedPlans = await refreshPlans();

        if (!createdPlanId) {
          const matchedPlan =
            [...refreshedPlans]
              .filter((plan) => plan.dateFrom === dateRange.from && plan.dateTo === dateRange.to)
              .sort((a, b) => b.id - a.id)[0] ?? null;
          createdPlanId = matchedPlan?.id ?? 0;
        }

        if (createdPlanId > 0) {
          saveStoredMealPlanCreator(createdPlanId, currentCreator);
          const refreshedWithCreator = await refreshPlans();
          setSavedPlans(refreshedWithCreator);
        }

        setNotice({ open: true, title: "Meal Plan Saved", message: successMessage, variant: "success" });
      };

      if (editingPlanId) {
        try {
          await ApiClient.patch(
            `/api/meal-plans/${editingPlanId}`,
            buildMealPlanMutationPayload(dateRange.from, dateRange.to, plans, editorStatus || "pending")
          );
          saveStoredMealPlanCreator(editingPlanId, currentCreator);
          await refreshPlans();
          setNotice({ open: true, title: "Meal Plan Updated", message: `Meal plan #${editingPlanId} has been updated.`, variant: "success" });
        } catch (error) {
          if (!(error instanceof Error) || !error.message.toLowerCase().includes("route not found")) {
            throw error;
          }

          await createPlanSubmission(
            editorStatus || "pending",
            `The backend does not support direct meal plan editing yet, so your revised plan was submitted as a new meal plan for admin review.`
          );
        }
        setEditingPlanId(null);
        setEditorStatus("pending");
        setView("list");
        return;
      }
      await createPlanSubmission("pending", "Meal plan submitted for admin approval.");
      setEditingPlanId(null);
      setEditorStatus("pending");
      setView("list");
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Error saving meal plan.";
      setNotice({ open: true, title: "Save Failed", message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecipe = (planIndex: number, mealType: MealType) => {
    const recipes = getRecipesForType(mealDirectory, mealType);
    if (recipes.length === 0) {
      setNotice({ open: true, title: "No Recipe Available", message: `Add a ${mealType.toLowerCase()} recipe in Meal Directory first.`, variant: "warning" });
      return;
    }
    const next = [...plans];
    next[planIndex].meals[mealType].items.push(buildPlannedMealItem(recipes[0]));
    setPlans(next);
  };

  const handleRecipeChange = (planIndex: number, mealType: MealType, itemIndex: number, recipeId: number) => {
    const recipe = mealDirectory.find((entry) => entry.id === recipeId);
    if (!recipe) return;
    const next = [...plans];
    const existingId = next[planIndex].meals[mealType].items[itemIndex].id;
    next[planIndex].meals[mealType].items[itemIndex] = { ...buildPlannedMealItem(recipe), id: existingId };
    setPlans(next);
  };

  const handlePaxChange = (planIndex: number, mealType: MealType, itemIndex: number, pax: number) => {
    const next = [...plans];
    next[planIndex].meals[mealType].items[itemIndex].pax = pax > 0 ? pax : 1;
    setPlans(next);
  };

  const handleRemoveItem = (planIndex: number, mealType: MealType, itemIndex: number) => {
    const next = [...plans];
    next[planIndex].meals[mealType].items = next[planIndex].meals[mealType].items.filter((_, index) => index !== itemIndex);
    setPlans(next);
  };

  const resetEditor = () => {
    setEditingPlanId(null);
    setDateRange(getCurrentWeekRange());
    setPlans([]);
    setEditorStatus("pending");
    setView("editor");
  };

  const handleDateInputChange = (field: "from" | "to", value: string) => {
    if (!value) return;
    setDateRange((current) => ({
      ...current,
      from: field === "from" ? value : current.from,
      to:
        field === "to"
          ? value
          : current.to && current.to < value
          ? value
          : current.to,
    }));
  };

  const handleSaveWeeklyBudget = () => {
    const nextBudget = Number(weeklyBudgetDraft);
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      setNotice({ open: true, title: "Invalid Budget", message: "Enter a valid weekly estimated budget amount.", variant: "warning" });
      return;
    }

    saveStoredWeeklyBudget(nextBudget);
    setWeeklyBudget(nextBudget);
    setIsBudgetModalOpen(false);
    setNotice({ open: true, title: "Weekly Budget Saved", message: "The budget is saved for the current week only and will reset next week.", variant: "success" });
  };

  const clearPurchaseHandoffDraft = () => {
    setApprovedHandoffPlan(null);
    setHandoffCashDraft("");
    setHandoffNotesDraft("");
    setHandoffWarningMessage("");
  };

  const handleCancelPurchaseHandoff = async () => {
    if (!approvedHandoffPlan) return;

    setIsSavingHandoff(true);
    try {
      await ApiClient.patch(`/api/meal-plans/${approvedHandoffPlan.id}/status`, { status: "pending" });
      await refreshPlans();
      setPreviewPlan((current) => (current?.id === approvedHandoffPlan.id ? { ...current, status: "pending" } : current));
      clearPurchaseHandoffDraft();
      setNotice({
        open: true,
        title: "Approval Sent Back",
        message: `Meal plan #${approvedHandoffPlan.id} is back to pending. Complete the staff cash handoff when you are ready to approve it.`,
        variant: "info",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to return the meal plan to pending status.";
      setNotice({ open: true, title: "Back Failed", message, variant: "error" });
    } finally {
      setIsSavingHandoff(false);
    }
  };

  const handleSavePurchaseHandoff = async () => {
    if (!approvedHandoffPlan || !approvedHandoffSummary) return;

    const cashReleased = Number(handoffCashDraft);
    if (!Number.isFinite(cashReleased) || cashReleased <= 0) {
      setNotice({ open: true, title: "Invalid Cash Release", message: "Enter the cash amount the admin will release to the staff.", variant: "warning" });
      return;
    }

    setIsSavingHandoff(true);
    try {
      const handoffResult = await persistPurchaseHandoff({
        planId: approvedHandoffPlan.id,
        planLabel: `Meal Plan #${approvedHandoffPlan.id}`,
        cashReleased,
        estimatedProcurementCost: approvedHandoffSummary.estimatedProcurementCost,
        notes: handoffNotesDraft.trim(),
        assignedAt: new Date().toISOString(),
        assignedBy: user?.full_name?.trim() || user?.username?.trim() || "Admin",
      });

      clearPurchaseHandoffDraft();
      setNotice({
        open: true,
        title: handoffResult.persistedToServer ? "Approved and Sent to Staff" : "Saved Locally Only",
        message: handoffResult.persistedToServer
          ? `Meal plan #${approvedHandoffPlan.id} is now approved and the staff purchase checklist with released cash is ready.`
          : `Meal plan #${approvedHandoffPlan.id} was saved in this browser only because the backend handoff route is not live yet. Restart the backend on port 8080, then send the handoff again so staff can see it.`,
        variant: handoffResult.persistedToServer ? "success" : "warning",
      });
    } finally {
      setIsSavingHandoff(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook", "staff"]}>
      <div className="min-h-full bg-[#f4f5ef] pb-6 text-gray-800">
        <main className="mx-auto max-w-[88rem] px-3 pt-3 sm:px-4 md:px-5">
          {view === "list" ? (
            <div className="space-y-4">
              <div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900">Meal Planner</h1>
                  <p className="mt-1.5 text-sm font-medium text-[#2f6f4f]">{isAdmin ? "Review pending meal plans, approve or reject them, and adjust plans based on estimated budget." : isCook ? "Create weekly meal plans and submit them for admin approval." : "View the admin-approved meal plan and open the purchase checklist for missing ingredients."}</p>
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-slate-500" />
                    <h2 className="text-lg font-black text-slate-800">{isStaffChecklistView ? "Checklist Queue" : "Meal Plans"}</h2>
                  </div>

                  <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyBudgetDraft(weeklyBudget > 0 ? String(weeklyBudget) : "");
                          setIsBudgetModalOpen(true);
                        }}
                        className="inline-flex min-h-11 min-w-[210px] items-center justify-center rounded-2xl border border-emerald-100 bg-white px-5 py-3 text-center text-base font-semibold text-slate-900 shadow-sm transition hover:border-emerald-300"
                      >
                        <span className="truncate">Weekly Budget</span>
                      </button>
                    )}
                    {canCookCreate && (
                      <>
                        <div className="w-full md:w-auto">
                          <AppSelect
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                            className="min-w-[210px] px-4 py-3 text-sm shadow-sm"
                            menuClassName="rounded-2xl border border-emerald-100 bg-white p-2 shadow-[0_20px_50px_rgba(47,111,79,0.12)]"
                            optionClassName="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#2f6f4f]"
                            options={isStaffChecklistView ? [
                              { label: "Approved Plans", value: "approved" },
                            ] : [
                              { label: "All Categories", value: "all" },
                              { label: "Approved", value: "approved" },
                              { label: "Pending", value: "pending" },
                              { label: "Rejected", value: "rejected" },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/student-menu")}
                          className="inline-flex min-h-11 w-full min-w-[210px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-300 md:w-auto"
                        >
                          <ExternalLink className="h-4 w-4" /> View Public Menu
                        </button>
                        <button
                          type="button"
                          onClick={resetEditor}
                          className="inline-flex min-h-11 w-full min-w-[210px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#285f44] md:w-auto"
                        >
                          <Plus className="h-5 w-5" /> New Plan
                        </button>
                      </>
                    )}
                    {!canCookCreate && (
                      <div className="w-full md:w-auto">
                        <AppSelect
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                          className="min-w-[210px] px-4 py-3 text-sm shadow-sm"
                          menuClassName="rounded-2xl border border-emerald-100 bg-white p-2 shadow-[0_20px_50px_rgba(47,111,79,0.12)]"
                          optionClassName="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#2f6f4f]"
                          options={isStaffChecklistView ? [
                            { label: "Approved Plans", value: "approved" },
                          ] : [
                            { label: "All Categories", value: "all" },
                            { label: "Approved", value: "approved" },
                            { label: "Pending", value: "pending" },
                            { label: "Rejected", value: "rejected" },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin ? (
                  <div className="rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
                    Weekly Budget: <span className="font-black text-slate-900">{formatCurrency(weeklyBudget)}</span>
                  </div>
                ) : isStaffChecklistView ? (
                  <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                    Admin-approved plans are forwarded here for staff purchasing and restocking.
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  <div className="hidden-scrollbar overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left">
                      <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6f4f]">
                        <tr>
                          <th className="px-4 py-3.5">Plan #</th>
                          <th className="px-4 py-3.5">Date Range</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Created By</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {listPlans.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-slate-500">{isLoadingPlans ? (isStaffChecklistView ? "Loading checklist..." : "Loading meal plans...") : (isStaffChecklistView ? "No approved checklist available." : "No meal plans available.")}</td></tr>
                        ) : (
                          paginatedPlans.map((plan) => (
                            <tr key={plan.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3.5 font-semibold">{plan.id > 0 ? `#${plan.id}` : "N/A"}</td>
                              <td className="px-4 py-3.5 font-medium">{formatDateInputValue(plan.dateFrom)} - {formatDateInputValue(plan.dateTo)}</td>
                              <td className="px-4 py-3.5"><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusClassName(plan.status)}`}>{formatStatus(plan.status)}</span></td>
                              <td className="px-4 py-3.5 text-slate-600">{getOwnerLabel(plan, planOwnerLookup, user, { preferAdminHandoffLabel: isStaffChecklistView })}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-center gap-3">
                                  {!isStaffChecklistView && (
                                    <button type="button" onClick={() => setPreviewPlan(plan)} className="text-slate-600 hover:text-blue-700"><Eye className="h-5 w-5" /></button>
                                  )}
                                  {isCook && !isPastPlan(plan) && (
                                    <button type="button" onClick={() => handleStartEdit(plan)} className="text-slate-600 hover:text-emerald-700"><Pencil className="h-5 w-5" /></button>
                                  )}
                                  {isStaffChecklistView && (
                                    <button type="button" onClick={() => router.push(`/meal-plan/${plan.id}?tab=checklist`)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-[#2f6f4f] transition hover:bg-emerald-100"><CheckSquare className="h-4 w-4" /> Open Purchase List</button>
                                  )}
                                  {canAdminReview && !isPastPlan(plan) && normalizePlanStatus(plan.status) === "pending" && (
                                    <>
                                      <button type="button" onClick={() => handleUpdateStatus(plan, "approved")} className="text-emerald-600 hover:text-emerald-700"><ShieldCheck className="h-5 w-5" /></button>
                                      <button type="button" onClick={() => handleUpdateStatus(plan, "rejected")} className="text-red-600 hover:text-red-700"><XCircle className="h-5 w-5" /></button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {listPlans.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-500">
                        Showing {(plansPage - 1) * PLANS_PER_PAGE + 1}-{Math.min(plansPage * PLANS_PER_PAGE, listPlans.length)} of {listPlans.length}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={plansPage === 1}
                          onClick={() => setPlansPage((current) => Math.max(1, current - 1))}
                          className="min-w-[78px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-400 transition hover:bg-slate-50 disabled:opacity-30"
                        >
                          Prev
                        </button>
                        <div className="flex min-w-16 items-center justify-center px-2 text-sm font-black text-[#2f6f4f]">
                          {plansPage} / {totalPlanPages}
                        </div>
                        <button
                          type="button"
                          disabled={plansPage === totalPlanPages}
                          onClick={() => setPlansPage((current) => Math.min(totalPlanPages, current + 1))}
                          className="min-w-[78px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-10 pt-2">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <button type="button" onClick={() => { setView("list"); setEditingPlanId(null); }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50" aria-label="Back to meal planner"><ArrowLeft size={20} /></button>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">{editingPlanId ? "Edit Meal Plan" : "New Meal Plan"}</h1>
                    <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Build a weekly plan and submit it to the admin for approval.</p>
                  </div>
                </div>
                <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Estimated Budget</p><p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(weeklyBudget)}</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Total Cost</p><p className={`mt-2 text-2xl font-black ${weeklyBudget > 0 && !isOverBudget ? "text-[#2f6f4f]" : isOverBudget ? "text-red-600" : "text-slate-900"}`}>{formatCurrency(totalCost)}</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Submission State</p><p className="mt-2 text-2xl font-black">{formatSubmissionState(editorStatus)}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-100 bg-white p-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-wide">From</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => handleDateInputChange("from", e.target.value)}
                      className="min-h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-wide">To</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.to}
                      min={dateRange.from}
                      onChange={(e) => handleDateInputChange("to", e.target.value)}
                      className="min-h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-6">
                {plans.map((plan, planIndex) => (
                  <div key={plan.isoDate || `${plan.dayName}-${plan.date}-${planIndex}`} className="rounded-xl border border-emerald-100 bg-white p-5">
                    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="font-black">{plan.dayName} ({plan.date})</h2>
                        {!plan.isHoliday && <p className="text-xs text-slate-500">Select directory recipes for each meal service.</p>}
                        {plan.isHoliday && <p className="text-xs font-bold text-orange-600">Holiday mode: no meals will be served on this day.</p>}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-black">
                        <input type="checkbox" checked={plan.isHoliday} onChange={(e) => { const next = [...plans]; next[planIndex].isHoliday = e.target.checked; setPlans(next); }} className="h-4 w-4" />
                        Holiday
                      </label>
                    </div>

                    {plan.isHoliday ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-400">No Daily Meal Plan</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        {MEAL_TYPES.map((mealType) => {
                          const recipeOptions = getRecipesForType(mealDirectory, mealType);
                          const mealItems = plan.meals[mealType].items;

                          return (
                            <div key={mealType} className="rounded-lg border border-emerald-100 bg-[#f9fbf5] p-4">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-black tracking-tight">{mealType}</h3>
                                  <p className="text-xs text-slate-500">{recipeOptions.length} recipe{recipeOptions.length === 1 ? "" : "s"} from meal directory</p>
                                </div>
                                <button onClick={() => handleAddRecipe(planIndex, mealType)} disabled={isLoadingRecipes} className="font-black text-emerald-700 disabled:text-slate-300"><Plus className="h-5 w-5" /></button>
                              </div>

                              <div className="space-y-3">
                                {mealItems.length === 0 && <p className="text-xs text-slate-400">{recipeOptions.length === 0 ? "No matching recipes in the meal directory yet." : "No dishes selected yet."}</p>}

                                {mealItems.map((item, itemIndex) => {
                                  const selectedRecipeId = item.recipeId ?? recipeOptions.find((recipe) => recipe.name === item.name)?.id ?? recipeOptions[0]?.id;
                                  return (
                                    <div key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <AppSelect
                                          value={String(selectedRecipeId ?? "")}
                                          onValueChange={(value) => handleRecipeChange(planIndex, mealType, itemIndex, Number(value))}
                                          className="flex-1 rounded-lg px-3 py-2 text-sm"
                                          options={recipeOptions.map((meal) => ({ label: `${meal.name} - ${meal.paxSize} pax`, value: String(meal.id) }))}
                                        />
                                        <button onClick={() => handleRemoveItem(planIndex, mealType, itemIndex)} className="text-red-600 hover:text-red-700"><XCircle className="h-4 w-4" /></button>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                                        <label className="flex flex-col gap-1"><span className="font-bold uppercase text-slate-500">Servings</span><input type="number" min={1} value={item.pax} onChange={(e) => handlePaxChange(planIndex, mealType, itemIndex, Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                                        <label className="flex flex-col gap-1"><span className="font-bold uppercase text-slate-500">Recipe Cost</span><input type="text" readOnly value={formatCurrency(estimateItemCost(item, inventoryLookups))} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" /></label>
                                      </div>
                                      <p className="text-[11px] font-bold tracking-wide text-slate-400">Recipe cost per serving: {formatCurrency(estimateItemPerPersonCost(item, inventoryLookups))}</p>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 rounded-[1rem] bg-[#2f6f4f] p-3 text-center text-xs font-black text-white">Total Recipe Cost: {formatCurrency(estimateMealTypeCost(plan, mealType, inventoryLookups))}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <button disabled={isSaving || isLoadingRecipes} onClick={handleSaveWeeklyPlan} className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6f4f] px-12 py-3 font-black text-white disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {isSaving ? "Saving..." : editingPlanId ? "Update Meal Plan" : "Submit to Admin"}
                </button>
              </div>
            </div>
          )}
        </main>

        <MealPlanPreviewDialog
          open={Boolean(previewPlan) && !approvedHandoffPlan}
          onOpenChange={(open) => { if (!open) setPreviewPlan(null); }}
          plan={previewPlan}
          inventoryItems={inventoryItems}
          showAdminInsights={Boolean(isAdmin)}
          canEdit={Boolean(isAdmin && previewPlan && !isPastPlan(previewPlan) && normalizePlanStatus(previewPlan.status) === "pending")}
          canReview={Boolean(canAdminReview && previewPlan && normalizePlanStatus(previewPlan.status) === "pending")}
          onEdit={(plan) => handleStartEdit(plan)}
          onApprove={(plan) => handleUpdateStatus(plan, "approved")}
          onReject={(plan) => handleUpdateStatus(plan, "rejected")}
        />

        <FeedbackDialog
          open={Boolean(approvedHandoffPlan)}
          title={approvedHandoffPlan ? `Release Cash for Meal Plan #${approvedHandoffPlan.id}` : "Release Cash"}
          message={
            approvedHandoffSummary
              ? `Assign the cash the staff will use for the missing ingredients. Estimated purchase cost: ${formatCurrency(approvedHandoffSummary.estimatedProcurementCost)}.`
              : "Assign the cash the staff will use for purchasing missing ingredients."
          }
          variant="info"
          confirmLabel="Approve and Send to Staff"
          cancelLabel="Back"
          onConfirm={handleSavePurchaseHandoff}
          onCancel={handleCancelPurchaseHandoff}
          loading={isSavingHandoff}
        >
          <div className="space-y-4">
            {handoffWarningMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Approval notes: {handoffWarningMessage}
              </div>
            ) : null}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-semibold text-slate-700">
              The staff checklist and released cash are finalized only after you send this handoff. If you go back, the meal plan returns to pending.
            </div>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              <span>Cash Released by Admin</span>
              <input
                ref={handoffCashInputRef}
                type="number"
                min={0}
                step="0.01"
                value={handoffCashDraft}
                onChange={(event) => setHandoffCashDraft(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500"
                placeholder="Enter cash release amount"
              />
              {approvedHandoffSummary ? (
                <button
                  type="button"
                  onClick={() => setHandoffCashDraft(String(approvedHandoffSummary.estimatedProcurementCost))}
                  className="w-fit rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
                >
                  Use estimated purchase cost: {formatCurrency(approvedHandoffSummary.estimatedProcurementCost)}
                </button>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              <span>Admin Notes</span>
              <textarea
                ref={handoffNotesInputRef}
                rows={3}
                value={handoffNotesDraft}
                onChange={(event) => setHandoffNotesDraft(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500"
                placeholder="Optional notes for the staff purchase handoff"
              />
              <button
                type="button"
                onClick={() => handoffNotesInputRef.current?.focus()}
                className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
              >
                Click to add staff instructions
              </button>
            </label>
          </div>
        </FeedbackDialog>

        <FeedbackDialog
          open={notice.open}
          title={notice.title}
          message={notice.message}
          variant={notice.variant}
          confirmLabel="OK"
          onConfirm={() => setNotice((current) => ({ ...current, open: false }))}
        />

        <FeedbackDialog
          open={isBudgetModalOpen}
          title="Weekly Estimated Budget"
          message={`Current amount: ${formatCurrency(weeklyBudget)}`}
          confirmLabel="Save"
          cancelLabel="Cancel"
          onConfirm={handleSaveWeeklyBudget}
          onCancel={() => setIsBudgetModalOpen(false)}
        >
          <div className="pt-2">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              <span>New Amount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={weeklyBudgetDraft}
                onChange={(e) => setWeeklyBudgetDraft(e.target.value)}
                placeholder="Enter new amount"
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </FeedbackDialog>
      </div>
    </RoleGuard>
  );
}

export default function MealPlannerApp() {
  return (
    <Suspense fallback={null}>
      <MealPlannerContent />
    </Suspense>
  );
}
