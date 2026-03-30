"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  NotebookText,
  Package,
  CalendarDays,
  UserCircle,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  pendingCount?: number;
  lowStockCount?: number;
}

export default function Sidebar({ 
    isOpen, 
    onClose, 
    pendingCount = 0, 
    lowStockCount = 0 
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  
  // These now exist because we updated the AuthContext above
  const { logout, isAdmin, isCook } = useAuth();

  const adminMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Users", path: "/accounts", icon: <Users size={22} /> },
    { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
    { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Meal Planner", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  const cookMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
    { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Meal Planner", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  const staffMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Food Menu", path: "/student-menu", icon: <NotebookText size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Meal Planner", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  // Determine which menu to show based on the helpers
  let menuItems = staffMenu;
  if (isAdmin) menuItems = adminMenu;
  else if (isCook) menuItems = cookMenu;

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      router.push("/login");
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        data-app-sidebar="true"
        className={`
        fixed inset-y-0 left-0 z-[70] w-72 bg-white/95 flex flex-col p-6 border-r border-slate-200 transition-all duration-300 ease-in-out shadow-xl backdrop-blur-md
        lg:translate-x-0 lg:h-screen
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isBodyModalOpen ? "pointer-events-none" : ""}
      `}
      >
        {/* Logo & Mobile Close Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1 shadow-sm">
              <Image src="/logo.png" alt="StockMate Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <h1 className="text-sm font-black leading-tight text-gray-800 uppercase tracking-tight">
              StockMate<br />
              <span className="text-[10px] text-gray-500 font-medium">Canteen System</span>
            </h1>
          </div>

          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        <hr className="border-slate-200 mb-6" />

        {/* Navigation Area */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
          {menuItems.map((item) => {
            const active = pathname === item.path;
            const isUsersTab = item.name === "Users";
            const isInventoryTab = item.name === "Inventory";

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose} 
                className={`relative flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-[#76ba53] text-white font-black shadow-sm"
                    : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${
                  active ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                }`}>
                  {item.icon}
                </span>
                <span className="truncate text-sm uppercase tracking-wide">{item.name}</span>
                
                {isUsersTab && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                    {pendingCount}
                  </span>
                )}

                {isInventoryTab && lowStockCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                    {lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="mt-auto border-t border-slate-200 pt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3 text-[#B71C1C] font-black uppercase text-xs tracking-widest hover:bg-red-50 w-full rounded-xl transition-all active:scale-95"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `}</style>
      </aside>
    </>
  );
}
