"use client";

import React from "react";
import {
  AlertTriangle,
  ClipboardList,
  PackageOpen,
  PackageSearch,
  PlusCircle,
} from "lucide-react";

type SharedOverviewStats = {
  inStock?: number;
  lowStock?: number;
  noStock?: number;
};

export default function SharedOverview({ stats }: { stats?: SharedOverviewStats | null }) {
  const items = [
    { label: "Available Stock", val: stats?.inStock || 0, color: "text-emerald-700", icon: <PackageOpen size={26} /> },
    { label: "Low Inventory", val: stats?.lowStock || 0, color: "text-amber-600", icon: <AlertTriangle size={26} /> },
    { label: "Critical / Out", val: stats?.noStock || 0, color: "text-red-600", icon: <PackageSearch size={26} /> },
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-6 flex items-start justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 transition-colors group-hover:text-slate-600">
                {item.label}
              </span>
              <span className={item.color}>{item.icon}</span>
            </div>
            <div className={`text-7xl font-black italic leading-none ${item.color}`}>{item.val}</div>
            <div className="pointer-events-none absolute bottom-4 right-6 text-4xl font-black italic text-slate-100">
              LIVE
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-6 ml-2 text-xl font-black text-slate-800">Quick Actions</h2>
        <div className="flex flex-wrap gap-6">
          <button className="flex items-center gap-3 rounded-2xl bg-[#66BB6A] px-8 py-5 font-bold text-black shadow-sm transition-all hover:scale-[1.02] hover:shadow-md">
            <PlusCircle size={22} />
            New Recipe
          </button>

          <button className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-5 font-bold text-slate-700 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md">
            <ClipboardList size={22} className="text-blue-500" />
            Post Today&apos;s Menu
          </button>

          <button className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-5 font-bold text-slate-700 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md">
            <PackageSearch size={22} className="text-orange-500" />
            Inventory Audit
          </button>
        </div>
      </section>
    </div>
  );
}
