"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, NotebookText, PhilippinePeso, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildInventoryPriceLookups,
  computeProcurementSummary,
  estimateItemCost,
  estimateItemPerPersonCost,
  formatDateInputValue,
  MealPlanRecord,
  MealType,
  normalizePlanStatus,
  normalizeTitleCase,
  ProcurementMode,
} from "@/lib/meal-planning";
import { useBodyModalState } from "@/hooks/useBodyModalState";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

interface InventoryItem {
  id: number;
  item: string;
  category?: string;
  threshold?: number;
  unit?: string;
  qty?: number;
  price?: number;
}

type OverviewCard = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  compact?: boolean;
};

function getStatusStyles(status: string) {
  switch (normalizePlanStatus(status)) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

interface MealPlanPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MealPlanRecord | null;
  inventoryItems?: InventoryItem[];
  showAdminInsights?: boolean;
  canEdit?: boolean;
  canReview?: boolean;
  onEdit?: (plan: MealPlanRecord) => void;
  onApprove?: (plan: MealPlanRecord) => void;
  onReject?: (plan: MealPlanRecord) => void;
}

export default function MealPlanPreviewDialog({
  open,
  onOpenChange,
  plan,
  inventoryItems = [],
  showAdminInsights = false,
  canEdit = false,
  canReview = false,
  onEdit,
  onApprove,
  onReject,
}: MealPlanPreviewDialogProps) {
  useBodyModalState(open);
  const [procurementMode, setProcurementMode] = useState<ProcurementMode>("minimum_purchase");

  const procurementSummary = useMemo(
    () =>
      plan
        ? computeProcurementSummary(plan, inventoryItems, procurementMode)
        : {
            inventoryCoverage: 0,
            totalRecipeCost: 0,
            estimatedProcurementCost: 0,
            expectedRevenue: 0,
            estimatedProfit: 0,
          },
    [inventoryItems, plan, procurementMode]
  );

  const inventoryLookups = useMemo(() => buildInventoryPriceLookups(inventoryItems), [inventoryItems]);

  if (!plan) return null;

  const totalServings = plan.planData.reduce((sum, day) => {
    if (day.isHoliday) return sum;
    return (
      sum +
      MEAL_TYPES.reduce(
        (dayTotal, mealType) =>
          dayTotal + day.meals[mealType].items.reduce((mealSum, item) => mealSum + item.pax, 0),
        0
      )
    );
  }, 0);

  const totalEntries = plan.planData.reduce((sum, day) => {
    if (day.isHoliday) return sum;
    return sum + MEAL_TYPES.reduce((daySum, mealType) => daySum + day.meals[mealType].items.length, 0);
  }, 0);

  const footerHasActions = canReview || canEdit;
  const overviewCards: OverviewCard[] = [
    {
      label: "Date Range",
      value: `${formatDateInputValue(plan.dateFrom)} to ${formatDateInputValue(plan.dateTo)}`,
      icon: <CalendarDays className="h-4 w-4" />,
      compact: true,
    },
    {
      label: "Planned Servings",
      value: totalServings.toLocaleString(),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Scheduled Dishes",
      value: totalEntries.toLocaleString(),
      icon: <NotebookText className="h-4 w-4" />,
    },
  ];
  const procurementCards: OverviewCard[] = showAdminInsights
    ? [
        {
          label: "Inventory Coverage",
          value: `${procurementSummary.inventoryCoverage.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}%`,
        },
        {
          label: "Total Recipe Cost",
          value: formatCurrency(procurementSummary.totalRecipeCost),
        },
        {
          label: "Estimated Procurement Cost",
          value: formatCurrency(procurementSummary.estimatedProcurementCost),
        },
        {
          label: "Expected Revenue",
          value: formatCurrency(procurementSummary.expectedRevenue),
        },
        {
          label: "Estimated Profit",
          value: formatCurrency(procurementSummary.estimatedProfit),
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={plan.id}
        className="flex h-[min(88vh,760px)] w-[min(96vw,1240px)] max-w-none flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-none"
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#fff4d7] via-[#eef6df] to-[#e7f1ff] px-5 py-4 lg:px-6">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 lg:text-2xl">
                  Meal Plan #{plan.id}
                </DialogTitle>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusStyles(plan.status)}`}>
                  {plan.status}
                </span>
              </div>
              <DialogDescription className="text-[13px] text-slate-600">
                Review the weekly meal setup before opening the full checklist page.
              </DialogDescription>
            </div>
          </div>

          {showAdminInsights ? (
            <div className="pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-700">Procurement Mode:</p>
                <select
                  value={procurementMode}
                  onChange={(event) => setProcurementMode(event.target.value as ProcurementMode)}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500"
                >
                  <option value="minimum_purchase">Minimum Purchase</option>
                  <option value="maintain_stock_level">Maintain Stock Level</option>
                </select>
              </div>
            </div>
          ) : null}

          {plan.createdByName ? (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/80 px-4 py-2.5">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Created By</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {plan.createdByName}
                {plan.createdByRole ? ` (${normalizeTitleCase(plan.createdByRole)})` : ""}
              </p>
            </div>
          ) : null}
        </DialogHeader>

        <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-6">
          <div className="space-y-4">
            <div className={`grid grid-cols-1 gap-2.5 md:grid-cols-3 ${showAdminInsights ? "xl:grid-cols-4" : ""}`}>
              {[...overviewCards, ...procurementCards].map((card) => (
                <div key={card.label} className="app-stat-card">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    {card.icon ?? null}
                    {card.label}
                  </div>
                  <p className={`mt-1.5 font-bold text-slate-900 ${card.compact ? "text-sm xl:text-[0.92rem]" : "text-sm xl:text-base"}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {plan.planData.map((day) => (
                <section
                  key={day.isoDate ?? day.date}
                  className="app-subtle-panel min-h-[220px] overflow-hidden"
                >
                  <div className="border-b border-slate-200 bg-white px-4 py-3.5">
                    <h3 className="text-base font-black text-slate-900">{day.dayName}</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{day.date}</p>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    {day.isHoliday ? (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm font-bold text-amber-800">
                        No meal service scheduled for this day.
                      </div>
                    ) : (
                      MEAL_TYPES.map((mealType) => (
                        <div key={mealType} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                              {mealType}
                            </p>
                            <p className="text-[11px] font-bold uppercase text-slate-400">
                              {day.meals[mealType].items.length} item{day.meals[mealType].items.length === 1 ? "" : "s"}
                            </p>
                          </div>

                          {day.meals[mealType].items.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                              Not scheduled
                            </div>
                          ) : (
                            day.meals[mealType].items.map((item) => (
                              <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {item.pax} servings
                                      {item.allergens?.trim() ? ` - Allergens: ${item.allergens}` : ""}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                      <PhilippinePeso className="h-3.5 w-3.5" />
                                      Recipe Cost
                                    </div>
                                    {(() => {
                                      const recipeCost = estimateItemCost(item, inventoryLookups);
                                      const recipeCostPerServing = estimateItemPerPersonCost(item, inventoryLookups);
                                      return (
                                        <>
                                          <p className="mt-1 text-[13px] font-black text-slate-900">
                                            {formatCurrency(recipeCost)}
                                          </p>
                                          <p className="mt-1 text-[11px] font-bold text-slate-400">
                                            Per serving: {formatCurrency(recipeCostPerServing)}
                                          </p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        {footerHasActions ? (
          <div className="shrink-0 flex gap-3 border-t border-slate-200 px-5 py-4">
            {canEdit && onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(plan)}
                className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100"
              >
                Edit Plan
              </button>
            ) : null}
            {canReview && onReject ? (
              <button
                type="button"
                onClick={() => onReject(plan)}
                className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
              >
                Reject Plan
              </button>
            ) : null}
            {canReview && onApprove ? (
              <button
                type="button"
                onClick={() => onApprove(plan)}
                className="flex-1 rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black text-white transition hover:bg-[#285f44]"
              >
                Approve Plan
              </button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
