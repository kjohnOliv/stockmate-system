"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Package,
  CalendarDays,
  UserCircle,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const role = user?.role;

  const adminMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Users", path: "/accounts", icon: <Users size={22} /> },
    { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Meal Planner", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  const cookMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Meal Directory", path: "/meal-directory", icon: <UtensilsCrossed size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Meal Planner", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  const staffMenu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={22} /> },
    { name: "Current Meal Plan", path: "/meal-plan", icon: <CalendarDays size={22} /> },
    { name: "Profile", path: "/profile", icon: <UserCircle size={22} /> },
  ];

  let menuItems = staffMenu;
  if (role === "admin") menuItems = adminMenu;
  else if (role === "cook") menuItems = cookMenu;

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    logout();
    router.push("/login");
  };

  return (
    <aside className="sticky top-0 h-screen w-72 bg-[#FFF9C4] flex flex-col p-6 border-r border-gray-300 flex-shrink-0 overflow-hidden">
      {/* Logo Section */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-white rounded-full border-2 border-green-700 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
          <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-sm font-bold leading-tight text-gray-800 truncate">
          Canteen Inventory<br />Management System
        </h1>
      </div>

      <hr className="border-gray-400 mb-6" />

      {/* Navigation Area - Internal Scroll Only */}
      <nav className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
        {menuItems.map((item) => {
          const active = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-5 py-3 rounded-xl font-bold transition-all duration-200 ${
                active
                  ? "bg-[#66BB6A] text-black shadow-md translate-x-1"
                  : "text-gray-700 hover:bg-yellow-100"
              }`}
            >
              <span className={`flex-shrink-0 ${active ? "text-black" : "text-gray-500"}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto border-t border-gray-400 pt-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-5 py-3 text-[#B71C1C] font-bold hover:bg-red-50 w-full rounded-xl transition-colors"
        >
          <LogOut size={22} />
          Logout
        </button>
      </div>
    </aside>
  );
}