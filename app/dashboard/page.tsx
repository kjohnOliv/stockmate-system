"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Package,
  PackageSearch,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { ApiClient, isAccessDeniedError, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import { formatLocalDateKey, normalizeActiveMealPlanPayload, normalizeMealPlanRecords, normalizePlanStatus } from "@/lib/meal-planning";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAdmin, isCook, isStaff } = useAuth();
  const { refreshVersions } = useNotifications();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [invStats, setInvStats] = useState({ inStock: 0, lowStock: 0, noStock: 0 });
  const [userCount, setUserCount] = useState(0);
  const [planCount, setPlanCount] = useState({ pending: 0, approved: 0, current: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (isAdmin) {
          try {
            const userRes = await ApiClient.get("/api/users");
            if (userRes.ok) {
              const userResult = await userRes.json();
              const users = Array.isArray(userResult?.data) ? userResult.data : [];
              setUserCount(users.length);
            } else {
              setUserCount(0);
            }
          } catch (err) {
            if (!isAccessDeniedError(err)) throw err;
            setUserCount(0);
          }
        } else {
          setUserCount(0);
        }

        try {
          const invRes = await ApiClient.get("/api/dashboard/overview");
          if (invRes.ok) {
            const invResult = await invRes.json();
            if (invResult.success && invResult.data) {
              setInvStats({
                inStock: invResult.data.inStock || 0,
                lowStock: invResult.data.lowStock || 0,
                noStock: invResult.data.noStock || 0,
              });
            } else {
              setInvStats({ inStock: 0, lowStock: 0, noStock: 0 });
            }
          }
        } catch (err) {
          if (!isAccessDeniedError(err)) throw err;
          setInvStats({ inStock: 0, lowStock: 0, noStock: 0 });
        }

        try {
          const planRes = await ApiClient.get(isStaff ? "/api/meal-plans/active" : "/api/meal-plans");
          if (planRes.ok) {
            const planResult = await planRes.json();
            const rawPlans = isStaff
              ? planResult?.data
                ? [planResult.data]
                : Array.isArray(planResult)
                ? planResult
                : planResult
                ? [planResult]
                : []
              : planResult?.success
              ? planResult.data
              : planResult?.data ?? planResult;
            const plans = isStaff ? normalizeActiveMealPlanPayload(rawPlans) : normalizeMealPlanRecords(rawPlans);
            const today = formatLocalDateKey();
            setPlanCount({
              pending: isStaff ? 0 : plans.filter((plan) => normalizePlanStatus(plan.status) === "pending").length,
              approved: plans.filter((plan) => normalizePlanStatus(plan.status) === "approved").length,
              current: plans.filter((plan) => plan.dateFrom <= today && plan.dateTo >= today).length,
            });
          } else {
            setPlanCount({ pending: 0, approved: 0, current: 0 });
          }
        } catch (err) {
          if (!isAccessDeniedError(err)) throw err;
          setPlanCount({ pending: 0, approved: 0, current: 0 });
        }
      } catch (err) {
        if (err instanceof Error && isPasswordChangeRequiredErrorMessage(err.message)) return;
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [isAdmin, isStaff, refreshVersions.dashboard, refreshVersions.inventory, refreshVersions.mealPlans, refreshVersions.users, user]);

  const stats = useMemo(
    () => [
      { label: "Items In Stock", value: invStats.inStock, icon: <Package size={22} />, tone: "bg-green-50 text-green-700" },
      { label: "Low Stock Alert", value: invStats.lowStock, icon: <AlertTriangle size={22} />, tone: "bg-orange-50 text-orange-700" },
      { label: "Out of Stock", value: invStats.noStock, icon: <PackageSearch size={22} />, tone: "bg-red-50 text-red-700" },
      { label: isAdmin ? "Total Users" : "Current Plans", value: isAdmin ? userCount : planCount.current, icon: isAdmin ? <Users size={22} /> : <CalendarDays size={22} />, tone: "bg-blue-50 text-blue-700" },
    ],
    [invStats, isAdmin, userCount, planCount]
  );

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <Loader2 className="animate-spin text-[#6BCB3B]" size={40} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 lg:space-y-4">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="text-[1.8rem] font-black leading-tight text-slate-800 lg:text-[2.2rem]">
            Hello, <span className="break-words text-[#6BCB3B]">{user?.full_name || "User"}</span>
          </h1>
          <p className="mt-1 max-w-4xl text-[13px] font-medium italic text-slate-500">
            {isAdmin && "Owner dashboard for account approvals, meal plan approvals, budget review, and menu management."}
            {isCook && "Kitchen dashboard for recipe management, inventory item additions, and weekly meal plan creation."}
            {isStaff && "Operations dashboard for inventory stock management, checklist updates, and weekly menu viewing."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm lg:p-4">
            {isDataLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            )}
            <div className={`mb-2.5 w-fit rounded-lg p-2 ${stat.tone}`}>{stat.icon}</div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <h3 className="mt-0.5 text-[1.8rem] font-black text-slate-800">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm lg:p-4">
          <h2 className="mb-3 font-black uppercase text-slate-800">
            {isAdmin ? "Quick Actions" : "Role Snapshot"}
          </h2>

          <div className={`grid grid-cols-1 gap-2.5 md:grid-cols-2 ${isAdmin ? "xl:grid-cols-3" : ""}`}>
            {isAdmin && (
              <>
                <button onClick={() => router.push("/accounts")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Review Accounts</p>
                  <p className="mt-1 text-[13px] text-slate-500">{userCount} users in the system</p>
                </button>
                <button onClick={() => router.push("/meal-plan")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Pending Meal Plans</p>
                  <p className="mt-1 text-[13px] text-slate-500">{planCount.pending} plans need admin action</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Inventory View</p>
                  <p className="mt-1 text-[13px] text-slate-500">{invStats.lowStock} low-stock items to review</p>
                </button>
                <button onClick={() => router.push("/meal-directory")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Meal Directory View</p>
                  <p className="mt-1 text-[13px] text-slate-500">Review recipes without editing directory items</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Manage Menu</p>
                  <p className="mt-1 text-[13px] text-slate-500">Review the published menu based on approved plans</p>
                </button>
              </>
            )}

            {isCook && (
              <>
                <button onClick={() => router.push("/meal-plan")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Submit Meal Plan</p>
                  <p className="mt-1 text-[13px] text-slate-500">{planCount.pending} plans currently awaiting approval</p>
                </button>
                <button onClick={() => router.push("/meal-directory")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Manage Recipes</p>
                  <p className="mt-1 text-[13px] text-slate-500">Keep menu selections aligned with inventory</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Add Inventory Item</p>
                  <p className="mt-1 text-[13px] text-slate-500">Add new ingredients that meal planning needs</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">View Menu</p>
                  <p className="mt-1 text-[13px] text-slate-500">Preview the published menu without editing it</p>
                </button>
              </>
            )}

            {isStaff && (
              <>
                <button onClick={() => router.push("/meal-plan")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Checklist</p>
                  <p className="mt-1 text-[13px] text-slate-500">Open the approved checklist for the current week.</p>
                </button>
                <button
                  onClick={() => router.push("/meal-plan")}
                  className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <p className="font-black text-slate-800">View Checklist</p>
                  <p className="mt-1 text-[13px] text-slate-500">Review ingredient checklist and mark completion.</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">Manage Inventory Stocks</p>
                  <p className="mt-1 text-[13px] text-slate-500">Update stock levels based on current inventory movement</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50">
                  <p className="font-black text-slate-800">View Weekly Menu</p>
                  <p className="mt-1 text-[13px] text-slate-500">See the approved weekly menu in read-only mode</p>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm lg:p-4">
          <h2 className="mb-3 font-black uppercase text-slate-800">
            {isAdmin ? "Analytics" : "Operations"}
          </h2>

          <div className="space-y-2.5">
            {isStaff && planCount.current === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="font-black text-amber-800">No Checklist Generated Yet</p>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#6BCB3B]" size={20} />
                <p className="font-black text-slate-800">
                  {isAdmin ? "Approved Plans" : "Ready for Service"}
                </p>
              </div>
              <p className="mt-1.5 text-[1.8rem] font-black text-slate-800">{planCount.approved}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {isAdmin
                  ? "Meal plans approved and ready for staff visibility."
                  : "Approved plans available for operational execution."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-blue-600" size={20} />
                <p className="font-black text-slate-800">
                  {isAdmin ? "Pending Reviews" : "Action Needed"}
                </p>
              </div>
              <p className="mt-1.5 text-[1.8rem] font-black text-slate-800">{planCount.pending}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {isAdmin
                  ? "Submitted meal plans waiting for budget review and approval."
                  : "Items that still require approval or stock attention."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
