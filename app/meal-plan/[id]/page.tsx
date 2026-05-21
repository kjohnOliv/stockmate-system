"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  Printer,
  ShoppingCart,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { ApiClient, isAccessDeniedError, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import { fetchPurchaseHandoff, PurchaseHandoffRecord, PurchaseReceiptRecord, readStoredPurchaseReceipts, saveStoredPurchaseReceipt } from "@/lib/purchase-handoff";
import {
  buildInventoryPriceLookups,
  DayPlan,
  estimateItemCost,
  formatDateInputValue,
  formatLocalDateKey,
  MealPlanRecord,
  normalizeActiveMealPlanPayload,
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
  inventoryId?: number | null;
  item: string;
  category: string;
  requiredQty: number;
  unit: string;
  estPrice: number;
  purchaseCost: number;
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

type DetailTab = "schedule" | "checklist";

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
            existing.purchaseCost = existing.shortageQty * existing.unitPrice;
            existing.matchedInventory = existing.matchedInventory || Boolean(matchedInventory);
            existing.inventoryId = existing.inventoryId ?? matchedInventory?.id ?? null;
            existing.status = existing.shortageQty <= 0 ? "done" : "pending";
            existing.category = existing.category || category;
          } else {
            const shortageQty = Math.max(0, quantity - inventoryQty);
            byIngredient.set(key, {
              inventoryId: matchedInventory?.id ?? null,
              item: ingredientName,
              category,
              requiredQty: quantity,
              unit: ingredient.unit || matchedInventory?.unit || "",
              estPrice: quantity * unitPrice,
              purchaseCost: shortageQty * unitPrice,
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

async function loadMealPlanRecordsForStaff() {
  try {
    const response = await ApiClient.get("/api/meal-plans");
    const result = await response.json();
    const list = result?.success ? result.data : result?.data ?? result;
    return normalizeMealPlanRecords(list);
  } catch (error) {
    if (!isAccessDeniedError(error)) throw error;

    const response = await ApiClient.get("/api/meal-plans/active");
    const result = await response.json();
    const activePlanSource = result?.data ?? result;
    return normalizeActiveMealPlanPayload(activePlanSource);
  }
}

function MealPlanDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user, isAdmin, isCook, isStaff } = useAuth();
  const { refreshVersions } = useNotifications();

  const resolveDetailTab = (value: string | null): DetailTab =>
    value === "checklist" ? "checklist" : "schedule";

  const [activeTab, setActiveTab] = useState<DetailTab>(resolveDetailTab(searchParams.get("tab")));
  const [planRecord, setPlanRecord] = useState<MealPlanRecord | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, ChecklistRow["status"]>>({});
  const [stockingItemKey, setStockingItemKey] = useState<string | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [shortageOverrides, setShortageOverrides] = useState<Record<string, number>>({});
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [shortageDrafts, setShortageDrafts] = useState<Record<string, string>>({});
  const [receiptNotes, setReceiptNotes] = useState("");
  const [submittedReceipt, setSubmittedReceipt] = useState<PurchaseReceiptRecord | null>(null);
  const [assignedHandoff, setAssignedHandoff] = useState<PurchaseHandoffRecord | null>(null);

  const formatCurrency = (value: number) =>
    `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const todayKey = formatLocalDateKey();

  const goBackToPlanner = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/meal-plan");
  };

  useEffect(() => {
    setActiveTab(resolveDetailTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (!isCook) return;

    const tab = searchParams.get("tab");
    if (tab === "checklist") {
      setActiveTab("schedule");
      router.replace(`/meal-plan/${id}?tab=schedule`, { scroll: false });
    }
  }, [id, isCook, router, searchParams]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [planResponse, inventoryResponse, recipeResponse] = await Promise.all([
          isStaff
            ? Promise.resolve(null)
            : ApiClient.get("/api/meal-plans").catch((error) => {
                if (isAccessDeniedError(error)) return null;
                throw error;
              }),
          ApiClient.get("/api/inventory").catch((error) => {
            if (isAccessDeniedError(error)) return null;
            return null;
          }),
          ApiClient.get("/api/recipes").catch((error) => {
            if (isAccessDeniedError(error)) return null;
            return null;
          }),
        ]);
        const rawPlanResult = isStaff
          ? await loadMealPlanRecordsForStaff()
          : await (async () => {
              if (!planResponse) return [];
              if (!planResponse.ok) throw new Error(`Meal plan request failed with ${planResponse.status}`);
              return planResponse.json();
            })();
        const recipeResult = recipeResponse?.ok ? await recipeResponse.json() : [];
        const recipeList = recipeResult?.success ? recipeResult.data : recipeResult?.data ?? recipeResult;
        const records = syncMealPlanRecordsWithRecipes(
          isStaff
            ? (rawPlanResult as MealPlanRecord[])
            : normalizeMealPlanRecords(
                (rawPlanResult as { success?: boolean; data?: unknown })?.success
                  ? (rawPlanResult as { data?: unknown }).data
                  : (rawPlanResult as { data?: unknown })?.data ?? rawPlanResult
              ),
          normalizeRecipes(recipeList)
        );

        const matchedRecord = records.find((record) => String(record.id) === id);
        const matchedApprovedRecord = records.find(
          (record) => String(record.id) === id && normalizePlanStatus(record.status) === "approved"
        );
        const currentApprovedRecord = records.find(
          (record) =>
            normalizePlanStatus(record.status) === "approved" &&
            record.dateFrom <= todayKey &&
            record.dateTo >= todayKey
        );
        const latestApprovedRecord =
          [...records]
            .filter((record) => normalizePlanStatus(record.status) === "approved")
            .sort((a, b) => (b.dateFrom || "").localeCompare(a.dateFrom || ""))[0] ?? null;

        setPlanRecord(
          isStaff
            ? matchedApprovedRecord ?? currentApprovedRecord ?? latestApprovedRecord ?? null
            : matchedRecord ?? null
        );

        if (inventoryResponse?.ok) {
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
  }, [id, isStaff, refreshVersions.inventory, refreshVersions.mealPlans, todayKey]);

  useEffect(() => {
    setBudgetDraft(planRecord?.estimatedBudget !== undefined ? String(planRecord.estimatedBudget) : "");
    setEditingBudget(false);
    setChecklistOverrides({});
    setPriceOverrides({});
    setShortageOverrides({});
    setEditingRowKey(null);
    setPriceDrafts({});
    setShortageDrafts({});
    if (planRecord?.id) {
      const storedReceipt = readStoredPurchaseReceipts()[String(planRecord.id)] ?? null;
      setSubmittedReceipt(storedReceipt);
      setReceiptNotes(storedReceipt?.notes ?? "");
      fetchPurchaseHandoff(planRecord.id)
        .then((record) => setAssignedHandoff(record))
        .catch(() => setAssignedHandoff(null));
    } else {
      setAssignedHandoff(null);
      setSubmittedReceipt(null);
      setReceiptNotes("");
    }
  }, [planRecord]);

  const checklist = useMemo(() => {
    const rows = buildChecklist(planRecord?.planData ?? [], inventoryItems);
    return rows.map((row) => {
      const key = `${normalizeText(row.item)}-${normalizeText(row.unit)}`;
      const override = checklistOverrides[key];
      const overriddenPrice = priceOverrides[key];
      const overriddenShortage = shortageOverrides[key];
      const unitPrice = Number.isFinite(overriddenPrice) ? overriddenPrice : row.unitPrice;
      const shortageQty =
        Number.isFinite(overriddenShortage) && overriddenShortage !== undefined
          ? Math.max(0, overriddenShortage)
          : row.shortageQty;
      const nextRow = {
        ...row,
        unitPrice,
        shortageQty,
        estPrice: row.requiredQty * unitPrice,
        purchaseCost: shortageQty * unitPrice,
      };
      return override ? { ...nextRow, status: override } : nextRow;
    });
  }, [checklistOverrides, inventoryItems, planRecord, priceOverrides, shortageOverrides]);

  const purchaseChecklist = useMemo(
    () => checklist.filter((row) => row.shortageQty > 0 || !row.matchedInventory),
    [checklist]
  );

  const inventoryLookups = useMemo(() => buildInventoryPriceLookups(inventoryItems), [inventoryItems]);
  const analytics = useMemo(() => buildAnalytics(checklist), [checklist]);
  const isStaffApprovedPlan = useMemo(() => {
    if (!planRecord) return false;
    return normalizePlanStatus(planRecord.status) === "approved";
  }, [planRecord]);
  const displayedBudget = planRecord?.estimatedBudget ?? analytics.totalEstimatedCost;
  const purchaseSummary = useMemo(
    () => ({
      itemsToBuy: purchaseChecklist.length,
      totalQtyToBuy: purchaseChecklist.reduce((sum, row) => sum + Math.max(0, row.shortageQty), 0),
      estimatedPurchaseCost: purchaseChecklist.reduce(
        (sum, row) => sum + Math.max(0, row.purchaseCost),
        0
      ),
    }),
    [purchaseChecklist]
  );
  const cashReleased = submittedReceipt?.cashReleased ?? assignedHandoff?.cashReleased ?? 0;
  const remainingCash = Math.max(0, cashReleased - purchaseSummary.estimatedPurchaseCost);

  const handleBudgetSave = async () => {
    if (!planRecord) return;

    const nextBudget = Number(budgetDraft);
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      alert("Enter a valid estimated budget.");
      return;
    }

    try {
      setIsSavingBudget(true);
      const response = await ApiClient.put(`/api/meal-plans/${planRecord.id}`, {
        date_from: planRecord.dateFrom,
        date_to: planRecord.dateTo,
        status: planRecord.status,
        estimated_budget: nextBudget,
        plan_data: planRecord.planData,
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

  const handleStockIngredient = async (item: ChecklistRow) => {
    if (!isStaff || !item.inventoryId || item.shortageQty <= 0) return;

    const matchedInventory = inventoryItems.find((entry) => Number(entry.id) === Number(item.inventoryId));
    if (!matchedInventory) return;

    const itemKey = `${normalizeText(item.item)}-${normalizeText(item.unit)}`;

    try {
      setStockingItemKey(itemKey);
      await ApiClient.put(`/api/inventory/${matchedInventory.id}`, {
        ...matchedInventory,
        qty: Number(matchedInventory.qty ?? 0) + item.shortageQty,
        price: item.unitPrice,
      });

      setInventoryItems((current) =>
        current.map((entry) =>
          Number(entry.id) === Number(matchedInventory.id)
            ? { ...entry, qty: Number(entry.qty ?? 0) + item.shortageQty, price: item.unitPrice }
            : entry
        )
      );
      setChecklistOverrides((current) => ({
        ...current,
        [itemKey]: "done",
      }));
    } catch (error) {
      console.error("Failed to stock ingredient", error);
      alert(`Unable to stock ${item.item} right now.`);
    } finally {
      setStockingItemKey(null);
    }
  };

  const handleStartEditChecklistRow = (item: ChecklistRow) => {
    const key = `${normalizeText(item.item)}-${normalizeText(item.unit)}`;
    setEditingRowKey(key);
    setPriceDrafts((current) => ({
      ...current,
      [key]: String(item.unitPrice),
    }));
    setShortageDrafts((current) => ({
      ...current,
      [key]: String(item.shortageQty),
    }));
  };

  const handleSaveEditedChecklistRow = async (item: ChecklistRow) => {
    const key = `${normalizeText(item.item)}-${normalizeText(item.unit)}`;
    const nextPrice = Number(priceDrafts[key] ?? item.unitPrice);
    const nextShortage = Number(shortageDrafts[key] ?? item.shortageQty);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      alert("Enter a valid ingredient price.");
      return;
    }
    if (!Number.isFinite(nextShortage) || nextShortage < 0) {
      alert("Enter a valid need to buy quantity.");
      return;
    }

    setPriceOverrides((current) => ({
      ...current,
      [key]: nextPrice,
    }));
    setShortageOverrides((current) => ({
      ...current,
      [key]: nextShortage,
    }));

    const matchedInventory = item.inventoryId
      ? inventoryItems.find((entry) => Number(entry.id) === Number(item.inventoryId))
      : inventoryItems.find((entry) => normalizeText(entry.item) === normalizeText(item.item));

    if (!matchedInventory) {
      setEditingRowKey(null);
      return;
    }

    try {
      await ApiClient.put(`/api/inventory/${matchedInventory.id}`, {
        ...matchedInventory,
        price: nextPrice,
      });

      setInventoryItems((current) =>
        current.map((entry) =>
          Number(entry.id) === Number(matchedInventory.id)
            ? { ...entry, price: nextPrice }
            : entry
        )
      );
      setEditingRowKey(null);
    } catch (error) {
      console.error("Failed to update ingredient price", error);
      alert(`Unable to save the new price for ${item.item}.`);
    }
  };

  const handleSubmitReceiptToAdmin = () => {
    if (!planRecord) return;
    if (!assignedHandoff && !submittedReceipt) {
      alert("The admin handoff amount is not available yet. Please wait for the admin to send the checklist cash release.");
      return;
    }
    if (!Number.isFinite(cashReleased) || cashReleased <= 0) {
      alert("The admin cash release amount is missing.");
      return;
    }

    const receipt: PurchaseReceiptRecord = {
      planId: planRecord.id,
      submittedAt: new Date().toISOString(),
      submittedBy: user?.full_name?.trim() || user?.username?.trim() || "Staff",
      cashReleased,
      totalSpent: purchaseSummary.estimatedPurchaseCost,
      remainingBalance: remainingCash,
      items: purchaseChecklist.map((item) => ({
        key: `${normalizeText(item.item)}-${normalizeText(item.unit)}`,
        item: item.item,
        category: item.category,
        qtyBought: item.shortageQty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.purchaseCost,
      })),
      notes: receiptNotes.trim(),
    };

    saveStoredPurchaseReceipt(receipt);
    setSubmittedReceipt(receipt);
    alert("Receipt sent to admin.");
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
      <div className="min-h-full bg-[#F3F4F6] p-5">
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-xl">
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
      <div className="min-h-full bg-[#F3F4F6] p-3 font-sans text-slate-800 md:p-4">
        <div className="mx-auto max-w-7xl">
          {isStaff && !isStaffApprovedPlan ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-xl">
              <h1 className="text-2xl font-black uppercase text-slate-800">No Approved Plan</h1>
              <p className="mt-3 text-slate-500">
                Staff can only view an approved meal plan and its checklist.
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
              <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={goBackToPlanner}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Go back"
                  >
                    <ArrowLeft size={22} strokeWidth={2.25} />
                  </button>
                  <div>
                    <h1 className="text-[1.75rem] font-black uppercase italic leading-none tracking-tighter">
                      Plan Details <span className="text-[#76ba53]">#{planRecord.id}</span>
                    </h1>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {formatDateInputValue(planRecord.dateFrom)} - {formatDateInputValue(planRecord.dateTo)}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2.5 sm:flex-row md:w-auto">
                  <div className="rounded-xl border-2 border-black bg-white px-4 py-2.5 text-[11px] font-black uppercase">
                    Status: {planRecord.status}
                  </div>
                  <div className="rounded-xl border-2 border-black bg-white px-4 py-2.5 text-[11px] font-black uppercase">
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
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-5 py-2.5 text-[11px] font-black uppercase text-slate-700 shadow-sm"
              >
                <Printer size={18} /> Print Report
              </button>
                </div>
              </div>

              <div className="mb-5 flex w-fit gap-2 rounded-[1.3rem] border border-emerald-100 bg-white p-1 shadow-sm">
                {(isCook ? (["schedule"] as DetailTab[]) : (["schedule", "checklist"] as DetailTab[])).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      router.push(`/meal-plan/${planRecord.id}?tab=${tab}`, { scroll: false });
                    }}
                    className={`flex items-center gap-2 rounded-[1rem] px-5 py-2.5 text-[11px] font-black uppercase transition-all md:px-6 ${
                      activeTab === tab
                        ? "bg-[#2f6f4f] text-white shadow-sm"
                        : "text-slate-500 hover:bg-emerald-50 hover:text-[#2f6f4f]"
                    }`}
                  >
                    {tab === "schedule" ? <Calendar size={16} /> : <ShoppingCart size={16} />}
                    {tab === "schedule" ? "Weekly Schedule" : isStaff ? "Purchase Checklist" : "Grocery Checklist"}
                  </button>
                ))}
              </div>

              {activeTab === "schedule" ? (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 xl:grid-cols-3">
                  {planRecord.planData.map((day) => (
                    <div
                      key={day.isoDate ?? day.date}
                      className="flex flex-col overflow-hidden rounded-[1.35rem] border border-emerald-100 bg-white shadow-[0_18px_40px_rgba(47,111,79,0.08)]"
                    >
                      <div className="table-header-emerald border-b border-emerald-100 p-4 text-center">
                        <h3 className="text-sm font-black uppercase tracking-widest">{day.dayName}</h3>
                        <p className="mt-1 text-xs font-bold">{day.date}</p>
                      </div>

                      <div className="flex-grow space-y-4 p-4">
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
                                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                      <p className="leading-tight font-bold text-slate-800">{item.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {item.pax} pax
                                        {item.allergens?.trim() ? ` - Allergens: ${item.allergens}` : ""}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Recipe cost: {formatCurrency(estimateItemCost(item, inventoryLookups))}
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
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isStaff ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Items To Buy</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{purchaseSummary.itemsToBuy}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Total Missing Qty</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                          {purchaseSummary.totalQtyToBuy.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Estimated Purchase Cost</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(purchaseSummary.estimatedPurchaseCost)}</p>
                      </div>
                    </div>
                  ) : null}

                  {isStaff ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Cash Released By Admin</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                          {cashReleased > 0 ? formatCurrency(cashReleased) : "Pending"}
                        </p>
                        {assignedHandoff ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Admin assigned this cash on {new Date(assignedHandoff.assignedAt).toLocaleString()}.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Waiting for the admin to save and send the cash handoff for this checklist.
                          </p>
                        )}
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Actual Spent</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(purchaseSummary.estimatedPurchaseCost)}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Change / Remaining Balance</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(remainingCash)}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-slate-700">
                    {isStaff
                      ? "Staff should use this list to buy only the missing ingredients, then stock the purchased quantity into inventory."
                      : "This checklist shows the ingredient requirements, current stock, and shortages for the approved meal plan."}
                  </div>

                <div className="overflow-hidden rounded-[1.35rem] border border-emerald-100 bg-white shadow-[0_18px_40px_rgba(47,111,79,0.08)]">
                  <div className="hidden-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-left">
                    <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-widest text-[#2f6f4f]">
                      <tr>
                        <th className="w-20 border-r border-emerald-100 p-4 text-center">Status</th>
                        <th className="border-r border-emerald-100 p-4">Ingredient</th>
                        <th className="border-r border-emerald-100 p-4 text-center">Required</th>
                        <th className="border-r border-emerald-100 p-4 text-center">In Stock</th>
                        <th className="border-r border-emerald-100 p-4 text-center">{isStaff ? "Need To Buy" : "Shortage"}</th>
                        <th className="border-r border-emerald-100 p-4 text-center">Unit Price</th>
                        <th className="border-r border-emerald-100 p-4">Estimated Price</th>
                        {isStaff ? <th className="border-r border-emerald-100 p-4 text-center">Price Action</th> : null}
                        {isStaff ? <th className="p-4 text-center">Stock Action</th> : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {(isStaff ? purchaseChecklist : checklist).length === 0 ? (
                        <tr>
                          <td colSpan={isStaff ? 9 : 7} className="p-6 text-center text-slate-500">
                            {isStaff
                              ? "No missing ingredients to buy for this approved meal plan."
                              : "No ingredient checklist available for this meal plan yet."}
                          </td>
                        </tr>
                      ) : (
                        (isStaff ? purchaseChecklist : checklist).map((item) => (
                          <tr
                            key={`${item.item}-${item.unit}`}
                            onClick={() => !isStaff && toggleChecklistStatus(item)}
                            className={`group font-bold transition-colors ${!isStaff ? "cursor-pointer hover:bg-emerald-50/40" : ""}`}
                            aria-label={
                              isStaff
                                ? `${item.item} purchase checklist row`
                                : `Toggle ${item.item} checklist status`
                            }
                          >
                            <td className="border-r border-emerald-50 p-4 text-center">
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
                            <td className="border-r border-emerald-50 p-4">
                              <p className="mb-1 text-base leading-none text-slate-800">{item.item}</p>
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
                            <td className="border-r border-emerald-50 p-4 text-center">
                              {item.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                            </td>
                            <td className="border-r border-emerald-50 p-4 text-center">
                              {item.inventoryQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                            </td>
                            <td className="border-r border-emerald-50 p-4 text-center">
                              {isStaff && editingRowKey === `${normalizeText(item.item)}-${normalizeText(item.unit)}` ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={shortageDrafts[`${normalizeText(item.item)}-${normalizeText(item.unit)}`] ?? String(item.shortageQty)}
                                  onChange={(event) =>
                                    setShortageDrafts((current) => ({
                                      ...current,
                                      [`${normalizeText(item.item)}-${normalizeText(item.unit)}`]: event.target.value,
                                    }))
                                  }
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                              ) : (
                                <span className={item.shortageQty > 0 ? "text-red-500" : "text-green-600"}>
                                  {item.shortageQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                                </span>
                              )}
                            </td>
                            <td className="border-r border-emerald-50 p-4 text-center">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="border-r border-emerald-50 p-4 font-bold text-slate-500 transition-colors group-hover:text-[#2f6f4f]">
                              {formatCurrency(isStaff ? item.purchaseCost : item.estPrice)}
                            </td>
                            {isStaff ? (
                              <td className="border-r border-emerald-50 p-4 text-center">
                                {editingRowKey === `${normalizeText(item.item)}-${normalizeText(item.unit)}` ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={priceDrafts[`${normalizeText(item.item)}-${normalizeText(item.unit)}`] ?? String(item.unitPrice)}
                                      onChange={(event) =>
                                        setPriceDrafts((current) => ({
                                          ...current,
                                          [`${normalizeText(item.item)}-${normalizeText(item.unit)}`]: event.target.value,
                                        }))
                                      }
                                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleSaveEditedChecklistRow(item);
                                      }}
                                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-[#2f6f4f]"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleStartEditChecklistRow(item);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>
                            ) : null}
                            {isStaff ? (
                              <td className="p-4 text-center">
                                {item.matchedInventory && item.shortageQty > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleStockIngredient(item);
                                    }}
                                    disabled={stockingItemKey === `${normalizeText(item.item)}-${normalizeText(item.unit)}`}
                                    className="rounded-xl bg-[#2f6f4f] px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-[#285f44] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {stockingItemKey === `${normalizeText(item.item)}-${normalizeText(item.unit)}` ? "Stocking..." : `Stock ${item.shortageQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${item.unit}`}
                                  </button>
                                ) : (
                                  <span className={`text-xs font-black uppercase ${item.matchedInventory ? "text-emerald-600" : "text-red-500"}`}>
                                    {item.matchedInventory ? "Ready" : "Add to inventory first"}
                                  </span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>

                  {isStaff ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Receipt Notes</p>
                          <textarea
                            value={receiptNotes}
                            onChange={(event) => setReceiptNotes(event.target.value)}
                            rows={3}
                            className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500"
                            placeholder="Add formal notes for the admin receipt, supplier details, or remaining cash explanation."
                          />
                        </div>
                        <div className="min-w-[260px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Purchase Summary</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">Cash Released: <span className="font-black text-slate-900">{formatCurrency(cashReleased)}</span></p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">Actual Spent: <span className="font-black text-slate-900">{formatCurrency(purchaseSummary.estimatedPurchaseCost)}</span></p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">Remaining Cash: <span className="font-black text-slate-900">{formatCurrency(remainingCash)}</span></p>
                          <button
                            type="button"
                            onClick={handleSubmitReceiptToAdmin}
                            className="mt-4 w-full rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black uppercase text-white transition hover:bg-[#285f44]"
                          >
                            {submittedReceipt ? "Update Receipt To Admin" : "Send Receipt To Admin"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {submittedReceipt ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Submitted Receipt</p>
                          <h3 className="mt-2 text-xl font-black text-slate-900">Purchase Receipt For Admin Review</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            Submitted by {submittedReceipt.submittedBy} on {new Date(submittedReceipt.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            Cash Released: <span className="font-black text-slate-900">{formatCurrency(submittedReceipt.cashReleased)}</span>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            Actual Spent: <span className="font-black text-slate-900">{formatCurrency(submittedReceipt.totalSpent)}</span>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            Remaining Cash: <span className="font-black text-slate-900">{formatCurrency(submittedReceipt.remainingBalance)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full min-w-[720px] text-left">
                          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Ingredient</th>
                              <th className="px-4 py-3 text-center">Bought Qty</th>
                              <th className="px-4 py-3 text-center">Unit Price</th>
                              <th className="px-4 py-3 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {submittedReceipt.items.map((item) => (
                              <tr key={item.key}>
                                <td className="px-4 py-3 font-bold text-slate-900">{item.item}</td>
                                <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                  {item.qtyBought.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-4 py-3 text-center font-black text-slate-900">{formatCurrency(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {submittedReceipt.notes ? (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-slate-700">
                          <span className="font-black text-slate-900">Notes:</span> {submittedReceipt.notes}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

export default function MealPlanDetailView() {
  return (
    <Suspense fallback={null}>
      <MealPlanDetailContent />
    </Suspense>
  );
}
