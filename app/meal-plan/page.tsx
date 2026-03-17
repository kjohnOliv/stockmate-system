"use client";

import React, { useState, useEffect } from 'react';
import { 
  Menu, Bell, Plus, ChevronDown, Eye, CheckSquare, 
  ArrowLeft, PlusCircle, Trash2, Check, Printer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import RoleGuard from "@/components/auth/RoleGuard"; 
import { useAuth } from "@/context/AuthContext"; 

// --- Types ---
type ViewMode = 'dashboard' | 'create';
type MealType = 'Breakfast' | 'Lunch' | 'Snack';
type StatusType = 'NOW SERVING' | 'COOKING' | 'PREPARING' | 'NOT YET STARTED';

interface MealItem {
  id: string; 
  name: string;
  pax: number;
}

interface MealCategory {
  status: StatusType;
  items: MealItem[];
}

interface DayPlan {
  date: string;
  dayName: string;
  isHoliday: boolean;
  meals: Record<MealType, MealCategory>;
}

const MEAL_DIRECTORY_DATA = [
  { id: 1, name: "Menudo", category: "Lunch", size: 50, ingredients: [{ name: "Pork", qty: 5, unit: "kg", avgPrice: 380 }] },
  { id: 2, name: "Afritada", category: "Lunch", size: 50, ingredients: [{ name: "Chicken", qty: 6, unit: "kg", avgPrice: 220 }] },
  { id: 5, name: "Hotsilog", category: "Breakfast", size: 30, ingredients: [{ name: "Hotdog", qty: 30, unit: "pcs", avgPrice: 10 }] },
  { id: 4, name: "Sopas", category: "Snack", size: 70, ingredients: [{ name: "Macaroni", qty: 2, unit: "kg", avgPrice: 110 }] },
];

export default function MealPlannerApp() {
  const { user } = useAuth(); 
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [dateFrom, setDateFrom] = useState("2026-02-16");
  const [dateTo, setDateTo] = useState("2026-02-20");
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const newPlans: DayPlan[] = [];
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      newPlans.push({
        date: dateString, dayName: dayName, isHoliday: false,
        meals: {
          Breakfast: { status: 'NOT YET STARTED', items: [] },
          Lunch: { status: 'NOT YET STARTED', items: [] },
          Snack: { status: 'NOT YET STARTED', items: [] },
        }
      });
    }
    setPlans(newPlans);
  }, [dateFrom, dateTo]);

  const handleSaveWeeklyPlan = async () => {
    setIsSaving(true);
    const payload = { date_from: dateFrom, date_to: dateTo, status: 'published', plan_data: plans };
    try {
      const response = await fetch('http://localhost:8080/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert("Saved successfully!");
        setView('dashboard');
      }
    } catch (error) {
      alert("Error connecting to server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-screen bg-[#f8f9fa] text-gray-800 pb-10">
        <header className="flex justify-between items-center p-6 bg-white border-b mb-6">
          <Menu className="w-7 h-7 cursor-pointer text-black" />
          <div className="relative">
            <Bell className="w-7 h-7 cursor-pointer text-black" />
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4">
          {view === 'dashboard' ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1a1c1e]">Meal Planner</h1>
                <p className="text-gray-500 text-sm">Plan weekly meal</p>
              </div>
              <button onClick={() => setView('create')} className="mb-6 flex items-center gap-2 bg-[#76ba53] text-white px-6 py-2 rounded-full font-bold">
                <Plus className="w-5 h-5" /> Create New
              </button>
              <div className="bg-white border border-gray-300 rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-center">
                  <thead className="bg-[#fff9c4] border-b text-[10px] font-bold uppercase text-black">
                    <tr>
                      <th className="p-3 border-r">Plan #</th>
                      <th className="p-3 border-r">Date Range</th>
                      <th className="p-3 border-r">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="p-4 border-r">1</td>
                      <td className="p-4 border-r font-medium uppercase text-[11px]">{dateFrom} - {dateTo}</td>
                      <td className="p-4 border-r">
                        <span className="bg-green-200 text-green-800 px-4 py-1 rounded-full text-[10px] font-bold">ONGOING</span>
                      </td>
                      <td className="p-4 flex justify-center gap-6">
                        {/* NECESSARY CHANGE: Navigate to dynamic ID route */}
                        <Eye className="w-6 h-6 text-gray-700 cursor-pointer hover:text-blue-700" 
                             onClick={() => router.push(`/meal-plan/1`)} />
                        <CheckSquare className="w-6 h-6 text-gray-700 cursor-pointer hover:text-green-600" 
                             onClick={() => router.push(`/meal-plan/1?tab=checklist`)} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CREATE VIEW - Kept mostly same as your provided code */
            <div className="animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setView('dashboard')} className="bg-black text-white p-2 rounded-full"><ArrowLeft/></button>
                  <h1 className="text-2xl font-bold uppercase">Weekly Meal Planner</h1>
                </div>
                <div className="flex justify-center gap-6 mb-10 bg-white p-6 rounded-2xl border max-w-fit mx-auto">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded-xl px-3 py-2 text-black" />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded-xl px-3 py-2 text-black" />
                </div>
                {/* ... Mapping plans logic here ... */}
                <div className="flex justify-center py-12">
                   <button onClick={handleSaveWeeklyPlan} disabled={isSaving} className="bg-[#76ba53] text-white px-20 py-4 rounded-full font-black uppercase shadow-xl">
                      {isSaving ? 'Saving...' : 'Save Weekly Plan'}
                   </button>
                </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}