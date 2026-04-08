"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckSquare, ClipboardCheck, Eye, ExternalLink, Pencil, Plus, Send, ShieldCheck, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import MealPlanPreviewDialog from "@/components/meal-plan/MealPlanPreviewDialog";
import { useAuth } from "@/context/AuthContext";
import { ApiClient, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import { buildPlannedMealItem, createPlansFromRange, DayPlan, estimatePlanCost, MealPlanRecord, MealType, normalizeMealPlanRecords, normalizePlanStatus, normalizeRecipes, PlannerRecipe, syncMealPlanRecordsWithRecipes } from "@/lib/meal-planning";
import { AlertNotice, FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";

type ViewMode = "list" | "editor";
type ListFilter = "current" | "past";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
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
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "rejected":
      return "bg-red-100 text-red-700";
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

function getOwnerLabel(plan: MealPlanRecord) {
  return `${plan.createdByName || "System"} (${plan.createdByRole || "Unspecified Role"})`;
}

export default function MealPlannerApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, isCook, isStaff } = useAuth();
  const [view, setView] = useState<ViewMode>("list");
  const [activeListView, setActiveListView] = useState<ListFilter>("current");
  const [dateRange, setDateRange] = useState(getCurrentWeekRange);
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<MealPlanRecord[]>([]);
  const [mealDirectory, setMealDirectory] = useState<PlannerRecipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [previewPlan, setPreviewPlan] = useState<MealPlanRecord | null>(null);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" | "warning" | "info" }>({ open: false, title: "", message: "", variant: "info" });
  const canAdminReview = isAdmin;
  const canCookCreate = isCook;

  const formatCurrency = (value: number) => `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "past" || requestedView === "current") setActiveListView(requestedView);
  }, [searchParams]);

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
        const response = await ApiClient.get(isStaff ? "/api/meal-plans/active" : "/api/meal-plans");
        const result = await response.json();
        const list = isStaff ? (result?.data ? [result.data] : []) : result?.success ? result.data : result?.data ?? result;
        setSavedPlans(normalizeMealPlanRecords(list));
      } catch (error) {
        if (error instanceof Error && isPasswordChangeRequiredErrorMessage(error.message)) return;
        setSavedPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    loadRecipes();
    loadSavedPlans();
  }, [isStaff]);

  const refreshPlans = async () => {
    const response = await ApiClient.get(isStaff ? "/api/meal-plans/active" : "/api/meal-plans");
    const result = await response.json();
    const list = isStaff ? (result?.data ? [result.data] : []) : result?.success ? result.data : result?.data ?? result;
    setSavedPlans(normalizeMealPlanRecords(list));
  };

  const displaySavedPlans = useMemo(() => syncMealPlanRecordsWithRecipes(savedPlans, mealDirectory), [savedPlans, mealDirectory]);
  const totalBudget = useMemo(() => estimatePlanCost(plans), [plans]);
  const totalMealsPlanned = useMemo(() => plans.reduce((sum, day) => day.isHoliday ? sum : sum + MEAL_TYPES.reduce((daySum, mealType) => daySum + day.meals[mealType].items.length, 0), 0), [plans]);

  const visiblePlans = useMemo(() => {
    const sorted = [...displaySavedPlans].sort((a, b) => (b.dateFrom || "").localeCompare(a.dateFrom || ""));
    if (isAdmin) return sorted;
    if (isCook) {
      return sorted.filter((plan) => {
        if (plan.createdById && user?.id) return plan.createdById === user.id;
        if (plan.createdByName && user?.full_name) return plan.createdByName === user.full_name;
        return true;
      });
    }
    if (isStaff) return sorted.filter((plan) => normalizePlanStatus(plan.status) === "approved" && isCurrentPlan(plan));
    return [];
  }, [displaySavedPlans, isAdmin, isCook, isStaff, user]);

  const currentPlans = visiblePlans.filter((plan) => !isPastPlan(plan));
  const pastPlans = visiblePlans.filter((plan) => isPastPlan(plan));
  const listPlans = activeListView === "past" ? pastPlans : currentPlans;

  const handleStartEdit = (plan: MealPlanRecord) => {
    setEditingPlanId(plan.id);
    setDateRange({ from: plan.dateFrom, to: plan.dateTo });
    setPlans(plan.planData);
    setView("editor");
    setPreviewPlan(null);
  };

  const handleUpdateStatus = async (plan: MealPlanRecord, status: "approved" | "rejected") => {
    try {
      await ApiClient.patch(`/api/meal-plans/${plan.id}/status`, { status });
      await refreshPlans();
      setPreviewPlan((current) => current ? { ...current, status } : current);
      setNotice({ open: true, title: status === "approved" ? "Meal Plan Approved" : "Meal Plan Rejected", message: `Meal plan #${plan.id} is now ${status}.`, variant: status === "approved" ? "success" : "warning" });
    } catch {
      setNotice({ open: true, title: "Action Failed", message: "Unable to update meal plan status.", variant: "error" });
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
      if (editingPlanId) {
        setNotice({ open: true, title: "Edit Not Supported", message: "Editing existing meal plans is not supported by the current backend yet. Please create a new plan instead.", variant: "warning" });
        setEditingPlanId(null);
        setView("list");
        return;
      }
      await ApiClient.post("/api/meal-plans", { date_from: dateRange.from, date_to: dateRange.to, status: "pending", plan_data: plans });
      await refreshPlans();
      setNotice({ open: true, title: "Meal Plan Saved", message: "Meal plan submitted for admin approval.", variant: "success" });
      setEditingPlanId(null);
      setView("list");
    } catch {
      setNotice({ open: true, title: "Save Failed", message: "Error saving meal plan.", variant: "error" });
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

  const handleManualCostChange = (planIndex: number, mealType: MealType, itemIndex: number, value: string) => {
    const parsed = value.trim() === "" ? undefined : Number(value);
    const next = [...plans];
    next[planIndex].meals[mealType].items[itemIndex].manualCostPerServing = parsed === undefined || !Number.isFinite(parsed) || parsed < 0 ? undefined : parsed;
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
    setView("editor");
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook", "staff"]}>
      <div className="min-h-screen bg-[#f4f5ef] pb-10 text-gray-800">
        <main className="mx-auto max-w-[88rem]">
          {view === "list" ? (
            <div className="space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">Meal Planner</h1>
                  <p className="mt-2 text-sm font-medium text-[#2f6f4f]">{isAdmin ? "Review pending meal plans, approve or reject them, and adjust plans based on estimated budget." : isCook ? "Create weekly meal plans and submit them for admin approval." : "View the approved weekly meal plan and manage the checklist."}</p>
                </div>
                {canCookCreate && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => router.push("/student-menu")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-6 py-3 font-bold text-slate-800 shadow-sm"><ExternalLink className="h-4 w-4" /> View Public Menu</button>
                    <button onClick={resetEditor} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f6f4f] px-6 py-3 font-bold text-white shadow-sm"><Plus className="h-5 w-5" /> New Plan</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Visible Plans</p><p className="mt-2 text-3xl font-black">{visiblePlans.length}</p></div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Current Plans</p><p className="mt-2 text-3xl font-black">{currentPlans.length}</p></div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Pending Approval</p><p className="mt-2 text-3xl font-black">{visiblePlans.filter((plan) => normalizePlanStatus(plan.status) === "pending").length}</p></div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Recipe Coverage</p><p className="mt-2 text-3xl font-black">{mealDirectory.length}</p></div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => { setActiveListView("current"); router.replace("/meal-plan?view=current"); }} className={`rounded-2xl px-5 py-3 text-sm font-black transition ${activeListView === "current" ? "bg-[#2f6f4f] text-white" : "border border-emerald-100 bg-white text-slate-600"}`}>Current Meal Plans</button>
                <button type="button" onClick={() => { setActiveListView("past"); router.replace("/meal-plan?view=past"); }} className={`rounded-2xl px-5 py-3 text-sm font-black transition ${activeListView === "past" ? "bg-[#2f6f4f] text-white" : "border border-emerald-100 bg-white text-slate-600"}`}>Past Meal Plans</button>
              </div>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  {activeListView === "current" ? <ClipboardCheck className="h-5 w-5 text-slate-500" /> : <CalendarDays className="h-5 w-5 text-slate-500" />}
                  <h2 className="text-lg font-black text-slate-800">{activeListView === "current" ? "Current Meal Plans" : "Past Meal Plans"}</h2>
                </div>

                <div className="overflow-hidden rounded-[1.35rem] border border-emerald-100 bg-white shadow-sm">
                  <div className="hidden-scrollbar overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left">
                      <thead className="table-header-emerald border-b border-emerald-100 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f6f4f]">
                        <tr>
                          <th className="p-4">Plan #</th>
                          <th className="p-4">Date Range</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Budget</th>
                          <th className="p-4">Created By</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {listPlans.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-slate-500">{isLoadingPlans ? "Loading meal plans..." : `No ${activeListView} meal plans available.`}</td></tr>
                        ) : (
                          listPlans.map((plan) => (
                            <tr key={plan.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="p-4 font-semibold">{plan.id}</td>
                              <td className="p-4 font-medium">{plan.dateFrom} - {plan.dateTo}</td>
                              <td className="p-4"><span className={`rounded-full px-4 py-1 text-[10px] font-bold ${statusClassName(plan.status)}`}>{formatStatus(plan.status)}</span></td>
                              <td className="p-4 font-bold text-slate-700">{formatCurrency(Number(plan.estimatedBudget ?? 0))}</td>
                              <td className="p-4 text-slate-600">{getOwnerLabel(plan)}</td>
                              <td className="p-4">
                                <div className="flex justify-center gap-3">
                                  <button type="button" onClick={() => setPreviewPlan(plan)} className="text-slate-600 hover:text-blue-700"><Eye className="h-5 w-5" /></button>
                                  {isAdmin && activeListView === "current" && <button type="button" onClick={() => handleStartEdit(plan)} className="text-slate-600 hover:text-emerald-700"><Pencil className="h-5 w-5" /></button>}
                                  <button type="button" onClick={() => router.push(`/meal-plan/${plan.id}?tab=checklist`)} className="text-slate-600 hover:text-green-700"><CheckSquare className="h-5 w-5" /></button>
                                  {canAdminReview && normalizePlanStatus(plan.status) === "pending" && (
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
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <button type="button" onClick={() => { setView("list"); setEditingPlanId(null); }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50" aria-label="Back to meal planner"><ArrowLeft size={20} /></button>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">{editingPlanId ? "Edit Meal Plan" : "New Meal Plan"}</h1>
                    <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Build a weekly plan and submit it to the admin for approval.</p>
                  </div>
                </div>
                <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Estimated Budget</p><p className="mt-2 text-2xl font-black text-[#2f6f4f]">{formatCurrency(totalBudget)}</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Planned Dishes</p><p className="mt-2 text-2xl font-black">{totalMealsPlanned}</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Submission State</p><p className="mt-2 text-2xl font-black">Pending</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-100 bg-white p-6 md:grid-cols-2">
                <label className="flex flex-col gap-2"><span className="text-xs font-black uppercase tracking-wide">From</span><input type="date" value={dateRange.from} onChange={(e) => setDateRange((current) => ({ ...current, from: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
                <label className="flex flex-col gap-2"><span className="text-xs font-black uppercase tracking-wide">To</span><input type="date" value={dateRange.to} onChange={(e) => setDateRange((current) => ({ ...current, to: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
              </div>

              {editingPlanId && <AlertNotice message="The current backend still creates a new plan instead of updating the existing one." variant="warning" />}

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
                                        <label className="flex flex-col gap-1"><span className="font-bold uppercase text-slate-500">Manual Cost / Serving</span><input type="number" min={0} step="0.01" value={item.manualCostPerServing ?? ""} onChange={(e) => handleManualCostChange(planIndex, mealType, itemIndex, e.target.value)} placeholder="Optional" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                                      </div>
                                      <p className="text-[11px] font-bold tracking-wide text-slate-400">Published menu amount: {item.manualCostPerServing ? formatCurrency(item.manualCostPerServing) : "Uses computed estimate"}</p>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 rounded-[1rem] bg-[#2f6f4f] p-3 text-center text-xs font-black text-white">Total Servings: {mealItems.reduce((acc, item) => acc + item.pax, 0)} pax</div>
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
          open={Boolean(previewPlan)}
          onOpenChange={(open) => { if (!open) setPreviewPlan(null); }}
          plan={previewPlan}
          canEdit={Boolean(isAdmin && previewPlan && !isPastPlan(previewPlan))}
          canReview={Boolean(canAdminReview && previewPlan && normalizePlanStatus(previewPlan.status) === "pending")}
          onEdit={(plan) => handleStartEdit(plan)}
          onApprove={(plan) => handleUpdateStatus(plan, "approved")}
          onReject={(plan) => handleUpdateStatus(plan, "rejected")}
        />

        <FeedbackDialog
          open={notice.open}
          title={notice.title}
          message={notice.message}
          variant={notice.variant}
          confirmLabel="OK"
          onConfirm={() => setNotice((current) => ({ ...current, open: false }))}
        />
      </div>
    </RoleGuard>
  );
}
