"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Prevent flicker while redirecting
  if (!user) return null;

  const stats = [
    { 
      label: "Total Available Ingredients", 
      value: 13, 
      color: "border-[#3B82F6]", // Blue
      icon: "📦" 
    },
    { 
      label: "Low Stock", 
      value: 5, 
      color: "border-[#FACC15]", // Yellow
      icon: "⚠️" 
    },
    { 
      label: "Out of Stock", 
      value: 2, 
      color: "border-[#EF4444]", // Red
      icon: "❌" 
    },
  ];

  return (
    <div className="p-10 bg-[#F9FBFF] min-h-screen">
      {/* Header Section */}
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-[#1A1C21] tracking-tight">Dashboard</h1>
        <p className="text-gray-400 font-semibold text-sm mt-1">
          Welcome Back, {user.username} ({user.role})
        </p>
      </header>

      {/* Status Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className={`bg-white p-8 rounded-[28px] border-2 ${stat.color} flex justify-between items-center shadow-sm hover:shadow-md transition-shadow`}
          >
            <div>
              <p className="text-[#8E95A1] text-[13px] font-bold uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-5xl font-black text-[#1A1C21]">{stat.value}</p>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-2xl text-3xl">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Section - Outer box removed */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[#1A1C21]">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionButton 
          title="Create Meal Plan" 
          sub="Plan Meals for the week" 
          icon="📅" 
          iconBg="bg-[#EEF2FF]" // Light Blue
        />
        <ActionButton 
          title="View Checklist" 
          sub="Shopping Checklist" 
          icon="✅" 
          iconBg="bg-[#F0FDF4]" // Light Green
        />
        <ActionButton 
          title="View Inventory" 
          sub="Check Stock Levels" 
          icon="📦" 
          iconBg="bg-[#FFF7ED]" // Light Orange
        />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  title: string;
  sub: string;
  icon: string;
  iconBg: string;
}

function ActionButton({ title, sub, icon, iconBg }: ActionButtonProps) {
  return (
    <button className="flex items-center gap-5 p-6 bg-white border border-[#F1F5F9] rounded-[24px] hover:border-[#6BCB3B] hover:shadow-lg hover:-translate-y-1 transition-all text-left group w-full shadow-sm">
      <div className={`${iconBg} p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-inner`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="font-bold text-[16px] text-[#1A1C21]">{title}</p>
        <p className="text-xs text-[#94A3B8] font-semibold mt-0.5">{sub}</p>
      </div>
    </button>
  );
}