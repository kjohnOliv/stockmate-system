"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  ChevronDown,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  NotebookText,
  Package,
  UserCircle,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  pendingCount?: number;
  pendingMealPlans?: number;
  lowStockCount?: number;
}

type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { name: string; path: string }[];
};

export default function Sidebar({
  isOpen = false,
  onClose,
  onToggleCollapse,
  isCollapsed = false,
  pendingCount = 0,
  pendingMealPlans = 0,
  lowStockCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const { logout, isAdmin, isCook } = useAuth();

  const baseItems: MenuItem[] = useMemo(() => {
    const plannerItem: MenuItem = {
      name: "Meal Planner",
      path: "/meal-plan",
      icon: <CalendarDays size={22} />,
      badge: pendingMealPlans,
      children: [
        { name: "Current Meal Plans", path: "/meal-plan/current" },
        { name: "Past Meal Plans", path: "/meal-plan/past" },
      ],
    };

    if (isAdmin) {
      return [
        { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
        { name: "Users", path: "/accounts", icon: <Users size={22} />, badge: pendingCount },
        { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
        { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
        { name: "Inventory", path: "/inventory", icon: <Package size={22} />, badge: lowStockCount },
        plannerItem,
        { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
      ];
    }

    if (isCook) {
      return [
        { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
        { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
        { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
        { name: "Inventory", path: "/inventory", icon: <Package size={22} />, badge: lowStockCount },
        plannerItem,
        { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
      ];
    }

    const staffChecklistItem: MenuItem = {
      name: "Checklist",
      path: "/meal-plan/current",
      icon: <CheckSquare size={22} />,
    };

    return [
      { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
      { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
      { name: "Inventory", path: "/inventory", icon: <Package size={22} />, badge: lowStockCount },
      staffChecklistItem,
      { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
    ];
  }, [isAdmin, isCook, lowStockCount, pendingCount, pendingMealPlans]);

  useEffect(() => {
    const syncModalState = () => {
      setIsBodyModalOpen(document.body.classList.contains("app-modal-open"));
    };

    syncModalState();

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    router.push("/login");
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        data-app-sidebar="true"
        className={[
          "fixed inset-y-0 left-0 z-[70] flex h-screen flex-col border-r border-emerald-100 bg-white/95 p-5 shadow-xl backdrop-blur-md transition-[transform,width] duration-300",
          isCollapsed ? "w-28" : "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isBodyModalOpen ? "pointer-events-none" : "",
        ].join(" ")}
      >
        <div className={`mb-6 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex items-center rounded-2xl transition hover:bg-slate-50 ${isCollapsed ? "justify-center p-1.5" : "px-2 py-1.5"}`}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-white p-1 shadow-sm">
                <Image src="/icon.png" alt="StockMate icon" width={40} height={40} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-14 w-[190px] items-center overflow-hidden">
                <Image src="/stockmate-transparent.png" alt="StockMate logo" width={380} height={140} className="h-full w-full object-contain" priority />
              </div>
            )}
          </button>

          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className={`soft-scrollbar flex-1 space-y-1.5 overflow-y-auto ${isCollapsed ? "" : "pr-1"}`}>
          {baseItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const active = pathname === item.path || (hasChildren && pathname.startsWith("/meal-plan"));

            if (hasChildren) {
              return (
                <div key={item.path} className="rounded-[1.1rem] border border-transparent">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        router.push(item.path);
                        onClose?.();
                        return;
                      }
                      setPlannerOpen((current) => !current);
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`relative flex w-full items-center rounded-[1.1rem] px-4 py-2.5 text-left transition ${
                      active ? "bg-[#2f6f4f] font-black text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${isCollapsed ? "justify-center px-3 py-3" : "gap-4"}`}
                  >
                    <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 truncate text-sm">{item.name}</span>}
                    {item.badge && item.badge > 0 ? (
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white ${isCollapsed ? "absolute right-1 top-1" : "ml-auto"}`}>
                        {item.badge}
                      </span>
                    ) : null}
                    {!isCollapsed && <ChevronDown className={`h-4 w-4 transition-transform ${plannerOpen ? "rotate-180" : ""}`} />}
                  </button>
                  {plannerOpen && !isCollapsed && (
                    <div className="mt-1.5 space-y-1.5 pl-3">
                      {item.children?.map((child) => {
                        const selected = pathname === child.path;

                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onClick={onClose}
                            className={`block rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                              selected ? "bg-emerald-50 text-[#2f6f4f]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={`relative flex items-center rounded-[1.1rem] px-4 py-2.5 transition ${
                  active ? "bg-[#2f6f4f] font-black text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${isCollapsed ? "justify-center px-3 py-3" : "gap-4"}`}
              >
                <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
                {!isCollapsed && <span className="truncate text-sm">{item.name}</span>}
                {item.badge && item.badge > 0 ? (
                  <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white ${isCollapsed ? "absolute right-1 top-1" : "ml-auto"}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-emerald-50 pt-5">
          <button
            onClick={() => setShowLogoutDialog(true)}
            title={isCollapsed ? "Logout" : undefined}
            className={`flex w-full items-center rounded-[1.1rem] px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-50 ${isCollapsed ? "justify-center" : "gap-4"}`}
          >
            <LogOut size={20} />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      <FeedbackDialog
        open={showLogoutDialog}
        title="Logout Account"
        message="Are you sure you want to log out?"
        variant="warning"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}
