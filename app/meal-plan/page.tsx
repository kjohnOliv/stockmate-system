"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Eye,
  ExternalLink,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import MealPlanPreviewDialog from "@/components/meal-plan/MealPlanPreviewDialog";
import { useAuth } from "@/context/AuthContext";
import { ApiClient } from "@/lib/api";
import {
  buildPlannedMealItem,
  createPlansFromRange,
  DayPlan,
  estimatePlanCost,
  MealPlanRecord,
  MealType,
  normalizeMealPlanRecords,
  normalizePlanStatus,
  normalizeRecipes,
  PlannerRecipe,
} from "@/lib/meal-planning";

type ViewMode = "list" | "editor";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function getRecipesForType(recipes: PlannerRecipe[], mealType: MealType) {
  return recipes.filter((recipe) => recipe.category === mealType);
}

function formatStatus(status: string) {
  return normalizePlanStatus(status).replace(/_/g, " ").toUpperCase();
}

function statusClassName(status: string) {
  switch (normalizePlanStatus(status)) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "completed":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function isCurrentPlan(plan: MealPlanRecord) {
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(plan.dateFrom && plan.dateTo && plan.dateFrom <= today && plan.dateTo >= today);
}

function isPastPlan(plan: MealPlanRecord) {
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(plan.dateTo && plan.dateTo < today);
}

export default function MealPlannerApp() {
  const router = useRouter();
  const { user, isAdmin, isCook, isStaff } = useAuth();

  const [view, setView] = useState<ViewMode>("list");
  const [dateRange, setDateRange] = useState(getCurrentWeekRange);
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<MealPlanRecord[]>([]);
  const [mealDirectory, setMealDirectory] = useState<PlannerRecipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [previewPlan, setPreviewPlan] = useState<MealPlanRecord | null>(null);

  const formatCurrency = (value: number) =>
    `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  useEffect(() => {
    setPlans((current) => createPlansFromRange(dateRange.from, dateRange.to, current));
  }, [dateRange]);

  useEffect(() => {
    const loadRecipes = async () => {
      setIsLoadingRecipes(true);
      try {
        const response = await ApiClient.get("/api/recipes");
        if (!response.ok) throw new Error(`Recipe request failed with ${response.status}`);

        const result = await response.json();
        const list = result?.success ? result.data : result;
        setMealDirectory(normalizeRecipes(list));
      } catch (error) {
        console.warn("Unable to load meal directory from API", error);
        setMealDirectory([]);
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    const loadSavedPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const response = await ApiClient.get("/api/meal-plans");
        if (!response.ok) throw new Error(`Meal plan request failed with ${response.status}`);

        const result = await response.json();
        const list = result?.success ? result.data : result?.data ?? result;
        setSavedPlans(normalizeMealPlanRecords(list));
      } catch (error) {
        console.warn("Unable to load meal plans from API", error);
        setSavedPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    loadRecipes();
    loadSavedPlans();
  }, []);

  const totalBudget = useMemo(() => estimatePlanCost(plans), [plans]);
  const totalMealsPlanned = useMemo(
    () =>
      plans.reduce((sum, day) => {
        if (day.isHoliday) return sum;
        return sum + MEAL_TYPES.reduce((daySum, mealType) => daySum + day.meals[mealType].items.length, 0);
      }, 0),
    [plans]
  );

  const visiblePlans = useMemo(() => {
    const sorted = [...savedPlans].sort((a, b) => (b.dateFrom || "").localeCompare(a.dateFrom || ""));

    if (isAdmin) return sorted;

    if (isCook) {
      return sorted.filter((plan) => {
        if (plan.createdById && user?.id) return plan.createdById === user.id;
        if (plan.createdByName && user?.full_name) return plan.createdByName === user.full_name;
        return true;
      });
    }

    if (isStaff) {
      return sorted.filter((plan) => normalizePlanStatus(plan.status) === "approved" && isCurrentPlan(plan));
    }

    return [];
  }, [savedPlans, isAdmin, isCook, isStaff, user]);

  const currentPlans = visiblePlans.filter((plan) => !isPastPlan(plan));
  const pastPlans = visiblePlans.filter((plan) => isPastPlan(plan));

  const resetEditor = () => {
    setEditingPlanId(null);
    setDateRange(getCurrentWeekRange());
    setPlans([]);
    setView("editor");
  };

  const handleAddRecipe = (planIndex: number, mealType: MealType) => {
    const recipes = getRecipesForType(mealDirectory, mealType);
    if (recipes.length === 0) {
      alert(`No ${mealType.toLowerCase()} recipes are available in the meal directory yet.`);
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
    next[planIndex].meals[mealType].items[itemIndex] = {
      ...buildPlannedMealItem(recipe),
      id: existingId,
    };
    setPlans(next);
  };

  const handlePaxChange = (planIndex: number, mealType: MealType, itemIndex: number, pax: number) => {
    const next = [...plans];
    next[planIndex].meals[mealType].items[itemIndex].pax = pax > 0 ? pax : 1;
    setPlans(next);
  };

  const handleManualCostChange = (planIndex: number, mealType: MealType, itemIndex: number, value: string) => {
    const parsed = value.trim() === "" ? undefined : Number(value);
    const next = [...plans];
    next[planIndex].meals[mealType].items[itemIndex].manualCostPerServing =
      parsed === undefined || !Number.isFinite(parsed) || parsed < 0 ? undefined : parsed;
    setPlans(next);
  };

  const handleRemoveItem = (planIndex: number, mealType: MealType, itemIndex: number) => {
    const next = [...plans];
    next[planIndex].meals[mealType].items = next[planIndex].meals[mealType].items.filter((_, index) => index !== itemIndex);
    setPlans(next);
  };

  const handleStartEdit = (plan: MealPlanRecord) => {
    setEditingPlanId(plan.id);
    setDateRange({ from: plan.dateFrom, to: plan.dateTo });
    setPlans(plan.planData);
    setView("editor");
  };

  const refreshPlans = async () => {
    const response = await ApiClient.get("/api/meal-plans");
    if (!response.ok) return;
    const result = await response.json();
    const list = result?.success ? result.data : result?.data ?? result;
    setSavedPlans(normalizeMealPlanRecords(list));
  };

  const handleUpdateStatus = async (plan: MealPlanRecord, status: string) => {
    try {
      const response = await ApiClient.patch(`/api/meal-plans/${plan.id}/status`, { status });
      if (!response.ok) throw new Error(`Status update failed with ${response.status}`);
      setSavedPlans((current) => current.map((item) => (item.id === plan.id ? { ...item, status } : item)));
    } catch (error) {
      console.error("Plan status update failed", error);
      alert("Unable to update meal plan status.");
    }
  };

  const handleDeletePlan = async (plan: MealPlanRecord) => {
    if (!window.confirm(`Delete meal plan #${plan.id}? This cannot be undone.`)) return;

    try {
      let deleted = false;

      try {
        await ApiClient.delete(`/api/meal-plans/${plan.id}`);
        deleted = true;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("route not found") && !message.includes("http 404")) {
          throw error;
        }
      }

      if (!deleted) {
        await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "")}/mealplans/${plan.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }).then(async (response) => {
          if (!response.ok) {
            let message = `HTTP ${response.status}`;
            try {
              const data = await response.json();
              message = data.message || data.error || message;
            } catch {
              // Keep default message
            }
            throw new Error(message);
          }
        });
      }

      setSavedPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch (error) {
      console.error("Meal plan delete failed", error);
      alert("Unable to delete this meal plan. Restart the backend if the new delete route has not loaded yet.");
    }
  };

  const handleSaveBudget = async (plan: MealPlanRecord) => {
    const nextBudget = Number(budgetDraft);
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      alert("Enter a valid estimated budget.");
      return;
    }

    try {
      const response = await ApiClient.patch(`/api/meal-plans/${plan.id}`, {
        estimated_budget: nextBudget,
      });
      if (!response.ok) throw new Error(`Budget update failed with ${response.status}`);

      setSavedPlans((current) =>
        current.map((item) => (item.id === plan.id ? { ...item, estimatedBudget: nextBudget } : item))
      );
      setEditingBudgetId(null);
      setBudgetDraft("");
    } catch (error) {
      console.error("Budget update failed", error);
      alert("Budget update is not supported by the current backend endpoint yet.");
    }
  };

  const handleSaveWeeklyPlan = async () => {
    if (plans.length === 0) {
      alert("Please select a valid date range before saving.");
      return;
    }

    const hasMeals = plans.some((day) => !day.isHoliday && MEAL_TYPES.some((type) => day.meals[type].items.length > 0));
    if (!hasMeals) {
      alert("Add at least one meal from the directory before saving the plan.");
      return;
    }

    setIsSaving(true);
    const payload = {
      date_from: dateRange.from,
      date_to: dateRange.to,
      status: isAdmin ? "published" : "pending",
      plan_data: plans,
    };

    try {
      if (editingPlanId) {
        alert("Editing existing meal plans is not supported by the current backend. Please create a new plan.");
        setEditingPlanId(null);
        setView("list");
        return;
      }

      const response = await ApiClient.post("/api/meal-plans", payload);

      if (!response.ok) throw new Error(`Save failed with ${response.status}`);

      await refreshPlans();
      alert(isCook ? "Meal plan submitted for admin approval." : "Meal plan saved successfully.");
      setEditingPlanId(null);
      setView("list");
    } catch (error) {
      console.error("Meal plan save failed", error);
      alert(editingPlanId ? "Unable to update this meal plan with the current backend endpoint." : "Error saving meal plan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook", "staff"]}>
      <div className="min-h-screen bg-[#f8f9fa] text-gray-800 pb-10">
        <main className="mx-auto max-w-[88rem]">
          {view === "list" ? (
            <>
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-slate-800">Meal Planner</h1>
                    <p className="text-sm text-slate-500 mt-2">
                      {isAdmin && "Review current and past meal plans, approve pending submissions, and manage budget decisions."}
                      {isCook && "Create meal plans from the directory and submit them for admin approval."}
                      {isStaff && "View the current approved meal plan and open the checklist when a plan is ready."}
                    </p>
                  </div>
                  {!isStaff && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => router.push("/student-menu")}
                        className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 px-6 py-3 rounded-2xl font-bold shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> View Public Menu
                      </button>
                      <button
                        onClick={resetEditor}
                        className="inline-flex items-center justify-center gap-2 bg-[#76ba53] text-white px-6 py-3 rounded-2xl font-bold shadow-sm"
                      >
                        <Plus className="w-5 h-5" /> {isCook ? "Create New Plan" : "Create / Edit Plan"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">Visible Plans</p>
                    <p className="text-3xl font-black mt-2">{visiblePlans.length}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">Current Plans</p>
                    <p className="text-3xl font-black mt-2">{currentPlans.length}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">Pending Approval</p>
                    <p className="text-3xl font-black mt-2">{visiblePlans.filter((plan) => normalizePlanStatus(plan.status) === "pending").length}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">Recipe Coverage</p>
                    <p className="text-3xl font-black mt-2">{mealDirectory.length}</p>
                  </div>
                </div>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-slate-500" />
                    <h2 className="text-lg font-black text-slate-800">Current Meal Plans</h2>
                  </div>

                  <div className="overflow-hidden rounded-[1.1rem] border border-[#d8e4db] bg-white shadow-sm">
                    <table className="w-full text-center">
                      <thead className="border-b border-[#d8e4db] bg-[#eef6df] text-[10px] font-bold uppercase text-slate-700">
                        <tr>
                          <th className="p-4 border-r border-slate-200">Plan #</th>
                          <th className="p-4 border-r border-slate-200">Date Range</th>
                          <th className="p-4 border-r border-slate-200">Status</th>
                          <th className="p-4 border-r border-slate-200">Budget</th>
                          <th className="p-4 border-r border-slate-200">Owner</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {currentPlans.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-slate-500">
                              {isLoadingPlans ? "Loading meal plans..." : "No current meal plans available."}
                            </td>
                          </tr>
                        ) : (
                          currentPlans.map((plan) => (
                            <tr key={plan.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="p-4 border-r border-slate-100 font-semibold">{plan.id}</td>
                              <td className="p-4 border-r border-slate-100 font-medium uppercase text-[11px]">
                                {plan.dateFrom} - {plan.dateTo}
                              </td>
                              <td className="p-4 border-r border-slate-100">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${statusClassName(plan.status)}`}>
                                  {formatStatus(plan.status)}
                                </span>
                              </td>
                              <td className="p-4 border-r border-slate-100">
                                {isAdmin && editingBudgetId === plan.id ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      value={budgetDraft}
                                      onChange={(e) => setBudgetDraft(e.target.value)}
                                      className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                                    />
                                    <button onClick={() => handleSaveBudget(plan)} className="text-green-600 font-bold">Save</button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isAdmin) return;
                                      setEditingBudgetId(plan.id);
                                      setBudgetDraft(String(plan.estimatedBudget ?? 0));
                                    }}
                                    className={isAdmin ? "font-semibold text-slate-700 hover:text-black" : "font-semibold text-slate-700"}
                                  >
                                    {formatCurrency(Number(plan.estimatedBudget ?? 0))}
                                  </button>
                                )}
                              </td>
                              <td className="p-4 border-r border-slate-100 text-slate-500">{plan.createdByName || "System"}</td>
                              <td className="p-4">
                                <div className="flex justify-center gap-3">
                                  <button type="button" onClick={() => setPreviewPlan(plan)} className="text-slate-600 hover:text-blue-700">
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  {(isAdmin || isCook) && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(plan)}
                                      className="text-slate-600 hover:text-emerald-700"
                                    >
                                      <Pencil className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/meal-plan/${plan.id}?tab=checklist`)}
                                    className="text-slate-600 hover:text-green-700"
                                  >
                                    <CheckSquare className="w-5 h-5" />
                                  </button>
                                  {(isAdmin || isCook) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlan(plan)}
                                      className="text-slate-600 hover:text-red-700"
                                      aria-label={`Delete meal plan ${plan.id}`}
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  )}
                                  {isAdmin && normalizePlanStatus(plan.status) === "pending" && (
                                    <>
                                      <button type="button" onClick={() => handleUpdateStatus(plan, "approved")} className="text-green-600 hover:text-green-700">
                                        <ShieldCheck className="w-5 h-5" />
                                      </button>
                                      <button type="button" onClick={() => handleUpdateStatus(plan, "rejected")} className="text-red-600 hover:text-red-700">
                                        <XCircle className="w-5 h-5" />
                                      </button>
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
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-slate-500" />
                    <h2 className="text-lg font-black text-slate-800">Past Meal Plans</h2>
                  </div>

                  <div className="overflow-hidden rounded-[1.1rem] border border-[#d8e4db] bg-white shadow-sm">
                    <table className="w-full text-center">
                      <thead className="border-b border-[#d8e4db] bg-[#f4efe4] text-[10px] font-bold uppercase text-slate-700">
                        <tr>
                          <th className="p-4 border-r border-slate-200">Plan #</th>
                          <th className="p-4 border-r border-slate-200">Date Range</th>
                          <th className="p-4 border-r border-slate-200">Status</th>
                          <th className="p-4 border-r border-slate-200">Budget</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {pastPlans.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-slate-500">No past meal plans available.</td>
                          </tr>
                        ) : (
                          pastPlans.map((plan) => (
                            <tr key={plan.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="p-4 border-r border-slate-100 font-semibold">{plan.id}</td>
                              <td className="p-4 border-r border-slate-100 font-medium uppercase text-[11px]">{plan.dateFrom} - {plan.dateTo}</td>
                              <td className="p-4 border-r border-slate-100">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${statusClassName(plan.status)}`}>
                                  {formatStatus(plan.status)}
                                </span>
                              </td>
                              <td className="p-4 border-r border-slate-100">{formatCurrency(Number(plan.estimatedBudget ?? 0))}</td>
                              <td className="p-4">
                                <div className="flex justify-center gap-3">
                                  <button type="button" onClick={() => setPreviewPlan(plan)} className="text-slate-600 hover:text-blue-700">
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <button type="button" onClick={() => router.push(`/meal-plan/${plan.id}?tab=checklist`)} className="text-slate-600 hover:text-green-700">
                                    <CheckSquare className="w-5 h-5" />
                                  </button>
                                  {(isAdmin || isCook) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlan(plan)}
                                      className="text-slate-600 hover:text-red-700"
                                      aria-label={`Delete meal plan ${plan.id}`}
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">
                      {editingPlanId ? "Edit Meal Plan" : "Weekly Meal Planner"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                      {isCook
                        ? "Build a weekly plan and submit it to the admin for approval."
                        : "Create or adjust plans, then approve them based on estimated budget."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full lg:min-w-[420px]">
                    <div className="rounded-xl bg-white border border-slate-100 p-4">
                      <p className="text-xs uppercase font-bold text-slate-500">Estimated Budget</p>
                      <p className="text-2xl font-black text-[#2b982b] mt-2">{formatCurrency(totalBudget)}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 p-4">
                      <p className="text-xs uppercase font-bold text-slate-500">Planned Dishes</p>
                      <p className="text-2xl font-black mt-2">{totalMealsPlanned}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 p-4">
                      <p className="text-xs uppercase font-bold text-slate-500">Submission State</p>
                      <p className="text-2xl font-black mt-2">{isCook ? "Pending" : "Approved"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#d8e4db] bg-white p-6 md:grid-cols-2 xl:grid-cols-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wide">From</span>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((current) => ({ ...current, from: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wide">To</span>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((current) => ({ ...current, to: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </label>
                  <div className="md:col-span-2 rounded-lg border border-[#d8e4db] bg-[#f5f7ef] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Planner Notes</p>
                    <p className="text-sm text-slate-600 mt-2">
                      Set servings and optionally enter a manual cost per serving so the published food menu shows the final approved amount.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {plans.map((plan, planIndex) => (
                    <div key={plan.isoDate || `${plan.dayName}-${plan.date}-${planIndex}`} className="rounded-xl border border-[#d8e4db] bg-white p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div>
                          <h2 className="font-black uppercase">{plan.dayName} ({plan.date})</h2>
                          {!plan.isHoliday && <p className="text-xs text-slate-500">Select directory recipes for each meal service.</p>}
                          {plan.isHoliday && <p className="text-xs text-orange-600 font-bold">Holiday mode: no meals will be served on this day.</p>}
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-black">
                          <input
                            type="checkbox"
                            checked={plan.isHoliday}
                            onChange={(e) => {
                              const next = [...plans];
                              next[planIndex].isHoliday = e.target.checked;
                              setPlans(next);
                            }}
                            className="h-4 w-4"
                          />
                          Holiday
                        </label>
                      </div>

                      {plan.isHoliday ? (
                        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-400">No Daily Meal Plan</div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                          {MEAL_TYPES.map((mealType) => {
                            const recipeOptions = getRecipesForType(mealDirectory, mealType);
                            const mealItems = plan.meals[mealType].items;

                            return (
                              <div key={mealType} className="rounded-lg border border-[#d8e4db] bg-[#f9fbf5] p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div>
                                    <h3 className="font-black tracking-tight">{mealType}</h3>
                                    <p className="text-xs text-slate-500">
                                      {recipeOptions.length} recipe{recipeOptions.length === 1 ? "" : "s"} from meal directory
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAddRecipe(planIndex, mealType)}
                                    disabled={isLoadingRecipes}
                                    title={
                                      recipeOptions.length === 0
                                        ? `Add a ${mealType.toLowerCase()} recipe in Meal Directory first`
                                        : `Add ${mealType.toLowerCase()} recipe`
                                    }
                                    className="text-green-600 font-black disabled:text-slate-300"
                                  >
                                    <Plus className="w-5 h-5" />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {mealItems.length === 0 && (
                                    <p className="text-xs text-slate-400">
                                      {recipeOptions.length === 0
                                        ? "No matching recipes in the meal directory yet."
                                        : "No dishes selected yet."}
                                    </p>
                                  )}

                                  {mealItems.map((item, itemIndex) => {
                                    const selectedRecipeId =
                                      item.recipeId ??
                                      recipeOptions.find((recipe) => recipe.name === item.name)?.id ??
                                      recipeOptions[0]?.id;

                                    return (
                                      <div key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <select
                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                            value={selectedRecipeId ?? ""}
                                            onChange={(e) => handleRecipeChange(planIndex, mealType, itemIndex, Number(e.target.value))}
                                          >
                                            {recipeOptions.map((meal) => (
                                              <option key={meal.id} value={meal.id}>
                                                {meal.name} - {meal.paxSize} pax
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleRemoveItem(planIndex, mealType, itemIndex)}
                                            className="text-red-600 hover:text-red-700"
                                            aria-label={`Remove ${item.name}`}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                                          <label className="flex flex-col gap-1">
                                            <span className="font-bold uppercase text-slate-500">Servings</span>
                                            <input
                                              type="number"
                                              min={1}
                                              value={item.pax}
                                              onChange={(e) => handlePaxChange(planIndex, mealType, itemIndex, Number(e.target.value))}
                                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                            />
                                          </label>
                                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="font-bold uppercase text-slate-500">Default Batch</p>
                                            <p className="text-sm font-semibold mt-1">{item.basePax ?? item.pax} pax</p>
                                          </div>
                                          <label className="flex flex-col gap-1">
                                            <span className="font-bold uppercase text-slate-500">Manual Cost / Serving</span>
                                            <input
                                              type="number"
                                              min={0}
                                              step="0.01"
                                              value={item.manualCostPerServing ?? ""}
                                              onChange={(e) => handleManualCostChange(planIndex, mealType, itemIndex, e.target.value)}
                                              placeholder="Optional"
                                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                            />
                                          </label>
                                        </div>
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                          Published menu amount: {item.manualCostPerServing ? formatCurrency(item.manualCostPerServing) : "Uses computed estimate"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="mt-4 rounded-lg bg-[#2f6f4f] p-2 text-center text-xs font-black text-white">
                                  Total Servings: {mealItems.reduce((acc, item) => acc + item.pax, 0)} pax
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <button
                    disabled={isSaving || isLoadingRecipes}
                    onClick={handleSaveWeeklyPlan}
                    className="inline-flex items-center gap-2 bg-[#76ba53] text-white px-12 py-3 rounded-2xl font-black uppercase shadow-sm disabled:opacity-60"
                  >
                    {isCook ? <Send className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {isSaving ? "Saving..." : editingPlanId ? "Update Meal Plan" : isCook ? "Submit to Admin" : "Save Approved Plan"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
        <MealPlanPreviewDialog
          open={Boolean(previewPlan)}
          onOpenChange={(open) => {
            if (!open) setPreviewPlan(null);
          }}
          plan={previewPlan}
        />
      </div>
    </RoleGuard>
  );
}
