"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface AppTopbarProps {
  onOpenSidebar: () => void;
  pendingCount?: number;
  pendingMealPlans?: number;
  lowStockCount?: number;
  activePlanStatus?: string;
}

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "System Accounts",
  "/meal-directory": "Meal Directory",
  "/student-menu": "Food Menu",
  "/inventory": "Inventory",
  "/meal-plan": "Meal Planner",
  "/profile": "Profile",
};

export default function AppTopbar({ onOpenSidebar, pendingCount = 0, pendingMealPlans = 0, lowStockCount = 0, activePlanStatus, }: AppTopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const alertCount = pendingCount + pendingMealPlans + lowStockCount;
  const title = TITLES[pathname] ?? "StockMate";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="inline-flex lg:hidden items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-700"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">StockMate System</p>
            <h1 className="text-xl font-black text-slate-800">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-slate-800">{user?.full_name || "User"}</p>
            <p className="text-xs text-slate-500 uppercase">{user?.role || "member"}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative inline-flex items-center justify-center w-11 h-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-lg rounded-xl z-50">
                <div className="p-3 border-b border-slate-100 font-bold">Notifications</div>
                <ul className="max-h-64 overflow-y-auto">
                  {pendingCount > 0 && (
                    <li className="px-4 py-2 hover:bg-slate-50">
                      <Link href="/accounts" className="flex items-center justify-between">
                        <span>{pendingCount} pending account{pendingCount === 1 ? "" : "s"}</span>
                        <span className="text-xs text-blue-600">Review</span>
                      </Link>
                    </li>
                  )}

                  {pendingMealPlans > 0 && (
                    <li className="px-4 py-2 hover:bg-slate-50">
                      <Link href="/meal-plan" className="flex items-center justify-between">
                        <span>{pendingMealPlans} pending meal plan{pendingMealPlans === 1 ? "" : "s"}</span>
                        <span className="text-xs text-blue-600">Action</span>
                      </Link>
                    </li>
                  )}

                  {lowStockCount > 0 && (
                    <li className="px-4 py-2 hover:bg-slate-50">
                      <Link href="/inventory" className="flex items-center justify-between">
                        <span>{lowStockCount} low stock item{lowStockCount === 1 ? "" : "s"}</span>
                        <span className="text-xs text-blue-600">Check</span>
                      </Link>
                    </li>
                  )}

                  {activePlanStatus && (
                    <li className="px-4 py-2 hover:bg-slate-50">
                      <Link href="/student-menu" className="flex items-center justify-between">
                        <span>Active menu status: {activePlanStatus}</span>
                        <span className="text-xs text-blue-600">View</span>
                      </Link>
                    </li>
                  )}

                  {pendingCount === 0 && pendingMealPlans === 0 && lowStockCount === 0 && !activePlanStatus && (
                    <li className="px-4 py-3 text-center text-sm text-slate-500">No new notifications</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
