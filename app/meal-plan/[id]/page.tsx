"use client";

import React, { useState, use, useEffect } from 'react'; // Added useEffect
import { ArrowLeft, Printer, CheckCircle2, AlertCircle, ShoppingCart, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// UPDATED: Function signature remains correctly updated for Next.js 15
export default function MealPlanDetailView({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // NEW: Unwrap the params promise
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  // Initialize tab based on URL search params
  const [activeTab, setActiveTab] = useState<'schedule' | 'checklist'>(
    (searchParams.get('tab') as 'schedule' | 'checklist') || 'schedule'
  );

  // ADDED: Logic to ensure the tab switches if the URL changes (e.g., clicking a link elsewhere)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'schedule' || tab === 'checklist') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Mock data remains exactly as you had it
  const planData = {
    id: id, 
    dateFrom: "2026-02-16",
    dateTo: "2026-02-20",
    status: "ONGOING",
    meals: [
      { day: "MONDAY", breakfast: "Hotsilog", lunch: "Pork Menudo", snack: "Sopas", pax: 50 },
      { day: "TUESDAY", breakfast: "Tapasilog", lunch: "Chicken Adobo", snack: "Burger", pax: 50 },
      { day: "WEDNESDAY", breakfast: "Egg Sandwich", lunch: "Afritada", snack: "Spaghetti", pax: 50 },
    ],
    checklist: [
      { item: "Carrots", category: "Vegetable", stocks: "15 pcs", est: "5 pcs", price: 40, status: "done" },
      { item: "Hotdog", category: "Frozen", stocks: "0 kg", est: "2 kg", price: 200, status: "pending" },
      { item: "Whole Chicken", category: "Poultry", stocks: "0 kg", est: "5 kg", price: 360, status: "pending" },
    ]
  };

  // Safety check: ensure ID exists before rendering
  if (!id) return <div className="p-8 font-black uppercase">Error: Missing Plan ID</div>;

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="bg-black text-white p-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-all">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Plan Details #{planData.id}</h1>
              <p className="font-bold text-slate-500 uppercase text-xs tracking-widest">
                {planData.dateFrom} — {planData.dateTo}
              </p>
            </div>
          </div>
          <button className="bg-white border-2 border-black px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Printer size={18} /> Print Report
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 mb-8 bg-slate-200 p-1.5 rounded-[2rem] w-fit border-2 border-black">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] font-black text-xs uppercase transition-all ${activeTab === 'schedule' ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
          >
            <Calendar size={16} /> Weekly Schedule
          </button>
          <button 
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] font-black text-xs uppercase transition-all ${activeTab === 'checklist' ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
          >
            <ShoppingCart size={16} /> Grocery Checklist
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
            {planData.meals.map((day, i) => (
              <div key={i} className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-[#FFF9C4] border-b-2 border-black p-4 text-center">
                  <h3 className="font-black uppercase tracking-widest text-sm">{day.day}</h3>
                </div>
                <div className="p-6 space-y-6">
                  {['breakfast', 'lunch', 'snack'].map((m) => (
                    <div key={m}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m}</label>
                      <p className="font-bold text-slate-800">{(day as any)[m]}</p>
                    </div>
                  ))}
                  <div className="pt-4 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                    <span className="bg-[#76ba53] text-white px-3 py-1 rounded-full text-[10px] font-black">{day.pax} Pax</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-black rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FFF9C4] border-b-2 border-black font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-5 border-r-2 border-black text-center w-16">Status</th>
                  <th className="p-5 border-r-2 border-black">Ingredient</th>
                  <th className="p-5 border-r-2 border-black text-center">In Stock</th>
                  <th className="p-5 border-r-2 border-black text-center">To Buy</th>
                  <th className="p-5">Price (Est)</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {planData.checklist.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 font-bold">
                    <td className="p-5 border-r-2 border-black text-center">
                      {item.status === 'done' ? <CheckCircle2 className="text-[#76ba53] inline" /> : <AlertCircle className="text-red-400 inline" />}
                    </td>
                    <td className="p-5 border-r-2 border-black">
                      <p className="text-slate-800">{item.item}</p>
                      <span className="text-[10px] uppercase text-slate-400">{item.category}</span>
                    </td>
                    <td className="p-5 border-r-2 border-black text-center text-slate-500">{item.stocks}</td>
                    <td className="p-5 border-r-2 border-black text-center text-[#76ba53]">{item.est}</td>
                    <td className="p-5 italic text-slate-400">P{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}