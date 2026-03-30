"use client";

import React from "react";
import { CalendarDays, NotebookText, PhilippinePeso, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MealPlanRecord,
  MealType,
  estimateItemPerPersonCost,
  normalizePlanStatus,
} from "@/lib/meal-planning";
import { useBodyModalState } from "@/hooks/useBodyModalState";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

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
}

export default function MealPlanPreviewDialog({
  open,
  onOpenChange,
  plan,
}: MealPlanPreviewDialogProps) {
  useBodyModalState(open);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-[#fff4d7] via-[#eef6df] to-[#e7f1ff] px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                  Meal Plan #{plan.id}
                </DialogTitle>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusStyles(plan.status)}`}>
                  {plan.status}
                </span>
              </div>
              <DialogDescription className="text-sm text-slate-600">
                Review the weekly meal setup before opening the full checklist page.
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <CalendarDays className="h-4 w-4" />
                Date Range
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {plan.dateFrom} to {plan.dateTo}
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <Users className="h-4 w-4" />
                Planned Servings
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{totalServings}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <NotebookText className="h-4 w-4" />
                Scheduled Dishes
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{totalEntries}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {plan.planData.map((day) => (
              <section
                key={day.isoDate ?? day.date}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70"
              >
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <h3 className="text-lg font-black text-slate-900">{day.dayName}</h3>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{day.date}</p>
                </div>

                <div className="space-y-4 px-5 py-5">
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
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-slate-900">{item.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.pax} servings
                                    {item.allergens?.trim() ? ` • Allergens: ${item.allergens}` : ""}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                    <PhilippinePeso className="h-3.5 w-3.5" />
                                    Per Serving
                                  </div>
                                  <p className="mt-1 text-sm font-black text-slate-900">
                                    {formatCurrency(estimateItemPerPersonCost(item))}
                                  </p>
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
      </DialogContent>
    </Dialog>
  );
}
