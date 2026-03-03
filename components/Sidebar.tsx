"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LayoutDashboard, Package, Utensils, Calendar, User, Users } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth(); 

  // 1. Define all possible menu items with their required roles
  const allMenuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} />, roles: ["admin", "staff", "cook"] },
    { name: "Inventory", path: "/inventory", icon: <Package size={20} />, roles: ["admin", "staff"] },
    { name: "Meal Directory", path: "/meals", icon: <Utensils size={20} />, roles: ["admin", "cook"] },
    { name: "Meal Plan", path: "/meal-plan", icon: <Calendar size={20} />, roles: ["admin", "cook"] },
    { name: "Profile", path: "/profile", icon: <User size={20} />, roles: ["admin", "staff", "cook"] },
    { name: "Accounts", path: "/accounts", icon: <Users size={20} />, roles: ["admin"] },
  ];

  // 2. Filter the menu based on the logged-in user's role
  const filteredMenu = allMenuItems.filter((item) => 
    item.roles.includes(user?.role?.toLowerCase() || "")
  );

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    logout();
    localStorage.removeItem("user"); 
    router.push("/login");
    router.refresh(); 
  };

  return (
    <div className="w-64 bg-[#FFF176] min-h-screen p-6 flex flex-col border-r border-gray-200 shadow-sm">
      <div className="mb-10 px-2">
        <h2 className="text-2xl font-black text-[#2D3142] tracking-tighter uppercase">StockMate</h2>
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">
          {user?.role} Portal
        </p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {filteredMenu.map((item) => (
          <Link key={item.path} href={item.path}>
            <div className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold transition-all mb-1 ${
              pathname === item.path 
                ? "bg-white shadow-md text-black translate-x-1" 
                : "hover:bg-[#FFF9C4] text-gray-700 hover:translate-x-1"
            }`}>
              {item.icon}
              {item.name}
            </div>
          </Link>
        ))}
      </nav>

      {/* User Info & Logout Button */}
      <div className="mt-auto pt-6 border-t border-yellow-400/30">
        <div className="flex items-center gap-3 mb-4 px-2">
           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm">
              {user?.username?.charAt(0).toUpperCase() || "U"}
           </div>
           <div className="overflow-hidden">
             <p className="text-xs font-black text-gray-800 truncate">{user?.username || "User"}</p>
             <p className="text-[10px] text-gray-600 uppercase">{user?.role}</p>
           </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-red-600 font-black hover:bg-red-50 p-3 rounded-xl transition-all active:scale-95"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}