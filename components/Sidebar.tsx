"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  ChevronDown,
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
  pendingCount?: number;
  lowStockCount?: number;
}

type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { name: string; path: string }[];
};

export default function Sidebar({ isOpen = false, onClose, pendingCount = 0, lowStockCount = 0 }: SidebarProps) {
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
      children: [
        { name: "Current Meal Plans", path: "/meal-plan?view=current" },
        { name: "Past Meal Plans", path: "/meal-plan?view=past" },
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

    return [
      { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
      { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
      { name: "Inventory", path: "/inventory", icon: <Package size={22} />, badge: lowStockCount },
      plannerItem,
      { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
    ];
  }, [isAdmin, isCook, lowStockCount, pendingCount]);

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
          "fixed inset-y-0 left-0 z-[70] flex h-screen w-72 flex-col border-r border-emerald-100 bg-white/95 p-6 shadow-xl backdrop-blur-md transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isBodyModalOpen ? "pointer-events-none" : "",
        ].join(" ")}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 p-1 shadow-sm">
              <Image src="/logo.png" alt="StockMate Logo" width={40} height={40} className="h-full w-full object-contain" />
            </div>
            <h1 className="text-sm font-black leading-tight text-slate-900">
              StockMate
              <span className="block text-[11px] font-semibold text-slate-500">Canteen System</span>
            </h1>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
            <X size={20} />
          </button>
        </div>

        <nav className="hidden-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
          {baseItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const active = pathname === item.path || (hasChildren && pathname.startsWith("/meal-plan"));

            if (hasChildren) {
              return (
                <div key={item.path} className="rounded-[1.35rem] border border-transparent">
                  <button
                    type="button"
                    onClick={() => setPlannerOpen((current) => !current)}
                    className={`flex w-full items-center gap-4 rounded-[1.35rem] px-5 py-3 text-left transition ${
                      active ? "bg-[#2f6f4f] font-black text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                    <span className="flex-1 truncate text-sm">{item.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${plannerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {plannerOpen && (
                    <div className="mt-2 space-y-2 pl-4">
                      {item.children?.map((child) => {
                        const childActive = pathname === "/meal-plan" && typeof window === "undefined"
                          ? false
                          : pathname === "/meal-plan";
                        const isCurrent = child.path.includes("view=current");
                        const selectedByQuery =
                          typeof window !== "undefined" && window.location.search.includes(isCurrent ? "view=current" : "view=past");
                        const selected = childActive && selectedByQuery;

                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onClick={onClose}
                            className={`block rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
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
                className={`flex items-center gap-4 rounded-[1.35rem] px-5 py-3 transition ${
                  active ? "bg-[#2f6f4f] font-black text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                <span className="truncate text-sm">{item.name}</span>
                {item.badge && item.badge > 0 ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white/20 text-white" : "bg-emerald-50 text-[#2f6f4f]"}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-emerald-50 pt-6">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex w-full items-center gap-4 rounded-[1.35rem] px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50"
          >
            <LogOut size={20} />
            Logout
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
