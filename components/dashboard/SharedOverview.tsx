"use client";
import React from 'react';
import { PlusCircle, ClipboardList, PackageSearch } from "lucide-react";

export default function SharedOverview({ stats }: any) {
  const items = [
    { label: "Available Stock", val: stats?.inStock || 0, color: "text-black", icon: "📦" },
    { label: "Low Inventory", val: stats?.lowStock || 0, color: "text-amber-500", icon: "⚠️" },
    { label: "Critical / Out", val: stats?.noStock || 0, color: "text-red-600", icon: "❌" }
  ];

  return (
    <div className="space-y-12"> {/* Increased vertical spacing for the dashboard sections */}
      
      {/* 1. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((item, i) => (
          <div key={i} className="relative p-8 bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-transform hover:-translate-y-1 group border-none">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">
                {item.label}
              </span>
              <span className="text-4xl">{item.icon}</span>
            </div>
            <div className={`text-7xl font-black italic leading-none ${item.color}`}>
              {item.val}
            </div>
            <div className="absolute bottom-4 right-6 text-black/5 font-black text-4xl italic pointer-events-none">
              LIVE
            </div>
          </div>
        ))}
      </div>

      {/* 2. Quick Actions - Borders removed, Spacing added */}
      <section className="mt-8">
        <h2 className="text-xl font-black text-gray-800 mb-6 ml-2">Quick Actions</h2>
        <div className="flex flex-wrap gap-6">
          <button className="flex items-center gap-3 bg-[#66BB6A] text-black font-bold px-8 py-5 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border-none">
            <PlusCircle size={22} />
            New Recipe
          </button>
          
          <button className="flex items-center gap-3 bg-white text-gray-700 font-bold px-8 py-5 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border-none">
            <ClipboardList size={22} className="text-blue-500" />
            Post Today's Menu
          </button>

          <button className="flex items-center gap-3 bg-white text-gray-700 font-bold px-8 py-5 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border-none">
            <PackageSearch size={22} className="text-orange-500" />
            Inventory Audit
          </button>
        </div>
      </section>
    </div>
  );
}