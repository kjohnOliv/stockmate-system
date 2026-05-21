"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

interface AppTopbarProps {
  onOpenSidebar: () => void;
  pendingCount?: number;
  pendingMealPlans?: number;
  lowStockCount?: number;
}

export default function AppTopbar({ onOpenSidebar, pendingCount = 0, pendingMealPlans = 0, lowStockCount = 0 }: AppTopbarProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const { connectionState, notifications } = useNotifications();

  const alertCount = notifications.length + pendingCount + pendingMealPlans + lowStockCount;
  const connectionLabel =
    connectionState === "connected"
      ? "Live"
      : connectionState === "connecting" || connectionState === "reconnecting"
      ? "Connecting"
      : connectionState === "error"
      ? "Disconnected"
      : "Idle";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-3 py-3 md:px-5">
        <div className="flex min-w-0 items-center">
          <button
            onClick={onOpenSidebar}
            className="inline-flex min-w-0 items-center rounded-2xl px-3 py-2 text-left transition hover:bg-slate-50"
            aria-label="Toggle sidebar"
          >
            <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500 sm:text-sm md:text-base md:tracking-[0.2em]">
              StockMate System
            </p>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden max-w-[220px] text-right md:block lg:max-w-[280px]">
            <p className="truncate text-sm font-bold text-slate-800">{user?.full_name || "User"}</p>
            <p className="text-xs text-slate-500 uppercase">{user?.role || "member"}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-lg rounded-xl z-50">
                <div className="flex items-center justify-between border-b border-slate-100 p-3">
                  <span className="font-bold">Notifications</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      connectionState === "connected"
                        ? "bg-emerald-100 text-emerald-700"
                        : connectionState === "connecting" || connectionState === "reconnecting"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {connectionLabel}
                  </span>
                </div>
                <ul className="soft-scrollbar max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50">
                      <Link href={notification.href} className="block">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold text-slate-800">{notification.title}</span>
                          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                      </Link>
                    </li>
                  ))}

                  {notifications.length === 0 && (
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
