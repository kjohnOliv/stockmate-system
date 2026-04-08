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
import { ApiClient, isPasswordChangeRequiredErrorMessage } from "@/lib/api";
import { normalizeMealPlanRecords, normalizePlanStatus } from "@/lib/meal-planning";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAdmin, isCook, isStaff } = useAuth();
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
        const requests: Promise<Response>[] = [ApiClient.get("/api/dashboard/overview")];
        if (isAdmin) requests.unshift(ApiClient.get("/api/users"));
        if (isStaff) requests.push(ApiClient.get("/api/meal-plans/active"));
        else requests.push(ApiClient.get("/api/meal-plans"));
        const responses = await Promise.all(requests);

        const userRes = isAdmin ? responses[0] : null;
        const invRes = responses[isAdmin ? 1 : 0];
        const planRes = responses[isAdmin ? 2 : 1];

        if (userRes?.ok) {
          const userResult = await userRes.json();
          const users = Array.isArray(userResult?.data) ? userResult.data : [];
          setUserCount(users.length);
        } else if (!isAdmin) {
          setUserCount(0);
        }

        if (invRes.ok) {
          const invResult = await invRes.json();
          if (invResult.success && invResult.data) {
            setInvStats({
              inStock: invResult.data.inStock || 0,
              lowStock: invResult.data.lowStock || 0,
              noStock: invResult.data.noStock || 0,
            });
          }
        }

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
          const plans = normalizeMealPlanRecords(rawPlans);
          const today = new Date().toISOString().slice(0, 10);
          setPlanCount({
            pending: isStaff ? 0 : plans.filter((plan) => normalizePlanStatus(plan.status) === "pending").length,
            approved: plans.filter((plan) => normalizePlanStatus(plan.status) === "approved").length,
            current: plans.filter((plan) => plan.dateFrom <= today && plan.dateTo >= today).length,
          });
        }
      } catch (err) {
        if (err instanceof Error && isPasswordChangeRequiredErrorMessage(err.message)) return;
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [isAdmin, isStaff, user]);

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
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800">
            Hello, <span className="text-[#6BCB3B]">{user?.full_name || "User"}</span>
          </h1>
          <p className="text-slate-500 font-medium italic mt-2">
            {isAdmin && "Owner dashboard for account approvals, meal plan approvals, budget review, and menu management."}
            {isCook && "Kitchen dashboard for recipe management, inventory item additions, and weekly meal plan creation."}
            {isStaff && "Operations dashboard for inventory stock management, checklist updates, and weekly menu viewing."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
            {isDataLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            )}
            <div className={`mb-4 p-3 rounded-xl w-fit ${stat.tone}`}>{stat.icon}</div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-black text-slate-800 uppercase mb-6">
            {isAdmin ? "Quick Actions" : "Role Snapshot"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAdmin && (
              <>
                <button onClick={() => router.push("/accounts")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Review Accounts</p>
                  <p className="text-sm text-slate-500 mt-1">{userCount} users in the system</p>
                </button>
                <button onClick={() => router.push("/meal-plan")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Pending Meal Plans</p>
                  <p className="text-sm text-slate-500 mt-1">{planCount.pending} plans need admin action</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Inventory View</p>
                  <p className="text-sm text-slate-500 mt-1">{invStats.lowStock} low-stock items to review</p>
                </button>
                <button onClick={() => router.push("/meal-directory")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Meal Directory View</p>
                  <p className="text-sm text-slate-500 mt-1">Review recipes without editing directory items</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Manage Menu</p>
                  <p className="text-sm text-slate-500 mt-1">Review the published menu based on approved plans</p>
                </button>
              </>
            )}

            {isCook && (
              <>
                <button onClick={() => router.push("/meal-plan")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Submit Meal Plan</p>
                  <p className="text-sm text-slate-500 mt-1">{planCount.pending} plans currently awaiting approval</p>
                </button>
                <button onClick={() => router.push("/meal-directory")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Manage Recipes</p>
                  <p className="text-sm text-slate-500 mt-1">Keep menu selections aligned with inventory</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Add Inventory Item</p>
                  <p className="text-sm text-slate-500 mt-1">Add new ingredients that meal planning needs</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">View Menu</p>
                  <p className="text-sm text-slate-500 mt-1">Preview the published menu without editing it</p>
                </button>
              </>
            )}

            {isStaff && (
              <>
                <button onClick={() => router.push("/meal-plan")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Current Checklist</p>
                  <p className="text-sm text-slate-500 mt-1">Open the approved plan checklist when available</p>
                </button>
                <button onClick={() => router.push("/inventory")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">Manage Inventory Stocks</p>
                  <p className="text-sm text-slate-500 mt-1">Update stock levels based on current inventory movement</p>
                </button>
                <button onClick={() => router.push("/student-menu")} className="text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="font-black text-slate-800">View Weekly Menu</p>
                  <p className="text-sm text-slate-500 mt-1">See the approved weekly menu in read-only mode</p>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-black text-slate-800 uppercase mb-6">
            {isAdmin ? "Analytics" : "Operations"}
          </h2>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#6BCB3B]" size={20} />
                <p className="font-black text-slate-800">
                  {isAdmin ? "Approved Plans" : "Ready for Service"}
                </p>
              </div>
              <p className="text-3xl font-black text-slate-800 mt-3">{planCount.approved}</p>
              <p className="text-sm text-slate-500 mt-1">
                {isAdmin
                  ? "Meal plans approved and ready for staff visibility."
                  : "Approved plans available for operational execution."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-blue-600" size={20} />
                <p className="font-black text-slate-800">
                  {isAdmin ? "Pending Reviews" : "Action Needed"}
                </p>
              </div>
              <p className="text-3xl font-black text-slate-800 mt-3">{planCount.pending}</p>
              <p className="text-sm text-slate-500 mt-1">
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
