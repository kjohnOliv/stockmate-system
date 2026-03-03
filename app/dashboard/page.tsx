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
    { label: "Total Available Ingredients", value: 13, color: "border-blue-500", icon: "📦" },
    { label: "Low Stock", value: 5, color: "border-yellow-400", icon: "⚠️" },
    { label: "Out of Stock", value: 2, color: "border-red-500", icon: "❌" },
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        {/* Now shows the real username and role from PostgreSQL! */}
        <p className="text-gray-500 font-medium capitalize">
          Welcome back, {user.username} ({user.role})
        </p>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-black">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-white p-6 rounded-xl border-2 ${stat.color} flex justify-between items-center shadow-sm`}>
            <div>
              <p className="text-gray-600 text-sm font-bold">{stat.label}</p>
              <p className="text-4xl font-black">{stat.value}</p>
            </div>
            <span className="text-3xl bg-gray-50 p-2 rounded-lg">{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-black">
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionButton title="Create Meal Plan" sub="Plan Meals for the week" icon="📅" color="bg-blue-100" />
          <ActionButton title="View Checklist" sub="Shopping Checklist" icon="✅" color="bg-green-100" />
          <ActionButton title="View Inventory" sub="Check Stock Levels" icon="📦" color="bg-orange-100" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ title, sub, icon, color }: { title: string; sub: string; icon: string; color: string }) {
  return (
    <button className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-[#6BCB3B] hover:bg-gray-50 transition-all text-left group w-full">
      <span className={`text-2xl ${color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>{icon}</span>
      <div>
        <p className="font-bold text-sm text-black">{title}</p>
        <p className="text-xs text-gray-500 font-medium">{sub}</p>
      </div>
    </button>
  );
}