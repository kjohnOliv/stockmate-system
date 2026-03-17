"use client";

import React, { useState, useEffect } from 'react';
import { 
  Menu, Bell, Plus, ChevronDown, Eye, CheckSquare, 
  ArrowLeft, PlusCircle, Trash2, Search, Check, Printer, Calendar, ShoppingCart
} from 'lucide-react';
import RoleGuard from "@/components/auth/RoleGuard"; 
import { useAuth } from "@/context/AuthContext"; 

// --- Types ---
type ViewMode = 'dashboard' | 'create' | 'viewOnly' | 'checklist';
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

// --- SHARED DIRECTORY DATA ---
const MEAL_DIRECTORY_DATA = [
  { 
    id: 1, name: "Menudo", category: "Lunch", size: 50, 
    ingredients: [
      { name: "Pork", qty: 5, unit: "kg", category: "Meat", avgPrice: 380 },
      { name: "Potato", qty: 2, unit: "kg", category: "Veggie", avgPrice: 80 },
      { name: "Tomato Sauce", qty: 1, unit: "L", category: "Pantry", avgPrice: 120 }
    ] 
  },
  { 
    id: 2, name: "Afritada", category: "Lunch", size: 50,
    ingredients: [
      { name: "Chicken", qty: 6, unit: "kg", category: "Meat", avgPrice: 220 },
      { name: "Carrots", qty: 1, unit: "kg", category: "Veggie", avgPrice: 90 }
    ]
  },
  { id: 3, name: "Giniling", category: "Lunch", size: 50, ingredients: [{ name: "Ground Pork", qty: 5, unit: "kg", category: "Meat", avgPrice: 350 }] },
  { id: 4, name: "Sopas", category: "Snack", size: 70, ingredients: [{ name: "Macaroni", qty: 2, unit: "kg", category: "Pantry", avgPrice: 110 }] },
  { id: 5, name: "Hotsilog", category: "Breakfast", size: 30, ingredients: [{ name: "Hotdog", qty: 30, unit: "pcs", category: "Meat", avgPrice: 10 }] },
  { id: 6, name: "Tapasilog", category: "Breakfast", size: 30, ingredients: [{ name: "Beef Tapa", qty: 3, unit: "kg", category: "Meat", avgPrice: 450 }] },
  { id: 7, name: "Burger", category: "Snack", size: 50, ingredients: [{ name: "Burger Patty", qty: 50, unit: "pcs", category: "Meat", avgPrice: 15 }] },
  { id: 8, name: "Egg Sandwich", category: "Snack", size: 50, ingredients: [{ name: "Egg", qty: 50, unit: "pcs", category: "Dairy", avgPrice: 9 }] },
  { id: 9, name: "Kwek-Kwek", category: "Snack", size: 30, ingredients: [{ name: "Quail Egg", qty: 90, unit: "pcs", category: "Dairy", avgPrice: 2 }] },
  { id: 10, name: "Spaghetti", category: "Snack", size: 30, ingredients: [{ name: "Pasta", qty: 3, unit: "kg", category: "Pantry", avgPrice: 100 }] },
];

export default function MealPlannerApp() {
  const { user } = useAuth(); 
  const [view, setView] = useState<ViewMode>('dashboard');
  const [dateFrom, setDateFrom] = useState("2026-02-16");
  const [dateTo, setDateTo] = useState("2026-02-20");
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- SYNC LOGIC ---
  useEffect(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const newPlans: DayPlan[] = [];
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const existingPlan = plans.find(p => p.date === dateString);
      
      newPlans.push(existingPlan || {
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

  // --- BACKEND SAVE HANDLER ---
  const handleSaveWeeklyPlan = async () => {
    setIsSaving(true);
    
    // Format the plan data for the backend JSONB column
    const payload = {
      date_from: dateFrom,
      date_to: dateTo,
      status: 'published',
      plan_data: plans // Your Go backend will save this whole array as JSONB
    };

    try {
      const response = await fetch('http://localhost:8080/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Weekly Meal Plan saved and published successfully!");
        setView('dashboard');
      } else {
        const errData = await response.json();
        alert("Failed to save plan: " + (errData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("Could not connect to the server.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- OTHER HANDLERS ---
  const handleAddItem = (dayIdx: number, type: MealType) => {
    const updated = [...plans];
    updated[dayIdx].meals[type].items.push({
      id: Math.random().toString(36).substr(2, 9),
      name: "Select Meal",
      pax: 0
    });
    setPlans(updated);
  };

  const handleMealSelection = (dayIdx: number, type: MealType, itemId: string, mealName: string) => {
    const updated = [...plans];
    const selectedMeal = MEAL_DIRECTORY_DATA.find(m => m.name === mealName);
    const itemIndex = updated[dayIdx].meals[type].items.findIndex(i => i.id === itemId);
    if (itemIndex > -1 && selectedMeal) {
      updated[dayIdx].meals[type].items[itemIndex] = {
        ...updated[dayIdx].meals[type].items[itemIndex],
        name: selectedMeal.name,
        pax: Number(selectedMeal.size) 
      };
      setPlans(updated);
    }
  };

  const handleDeleteItem = (dayIdx: number, type: MealType, itemId: string) => {
    const updated = [...plans];
    updated[dayIdx].meals[type].items = updated[dayIdx].meals[type].items.filter(i => i.id !== itemId);
    setPlans(updated);
  };

  // --- CHECKLIST LOGIC ---
  const generateChecklist = () => {
    const summary: Record<string, { name: string; category: string; qty: number; unit: string; totalCost: number; avgPrice: number }> = {};
    
    plans.forEach(day => {
      if (day.isHoliday) return;
      Object.values(day.meals).forEach(category => {
        category.items.forEach(item => {
          const mealTemplate = MEAL_DIRECTORY_DATA.find(m => m.name === item.name);
          if (mealTemplate?.ingredients) {
            const scaleFactor = item.pax / mealTemplate.size;
            mealTemplate.ingredients.forEach(ing => {
              const amount = ing.qty * scaleFactor;
              if (summary[ing.name]) {
                summary[ing.name].qty += amount;
                summary[ing.name].totalCost += (amount * ing.avgPrice);
              } else {
                summary[ing.name] = { 
                  name: ing.name, category: ing.category, qty: amount, 
                  unit: ing.unit, totalCost: amount * ing.avgPrice, avgPrice: ing.avgPrice 
                };
              }
            });
          }
        });
      });
    });
    return Object.values(summary);
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-10">
        <header className="flex justify-between items-center p-6 bg-white border-b border-gray-100 mb-6">
          <Menu className="w-7 h-7 cursor-pointer text-black" />
          <div className="relative">
            <Bell className="w-7 h-7 cursor-pointer text-black" />
            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-8">
          
          {/* --- DASHBOARD VIEW --- */}
          {view === 'dashboard' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1a1c1e]">Meal Planner</h1>
                <p className="text-gray-500 text-sm">Plan weekly meal</p>
              </div>
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setView('create')}
                  className="flex items-center gap-2 bg-[#76ba53] hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5" /> Create New
                </button>
              </div>
              <div className="bg-white border border-gray-300 rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#fff9c4] border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-black">
                    <tr>
                      <th className="p-3 border-r border-gray-300">Plan #</th>
                      <th className="p-3 border-r border-gray-300">Date From</th>
                      <th className="p-3 border-r border-gray-300">Date To</th>
                      <th className="p-3 border-r border-gray-300">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-gray-300">
                      <td className="p-4 border-r border-gray-300 text-black">1</td>
                      <td className="p-4 border-r border-gray-300 text-black">{dateFrom}</td>
                      <td className="p-4 border-r border-gray-300 text-black">{dateTo}</td>
                      <td className="p-4 border-r border-gray-300">
                        <span className="bg-green-200 text-green-800 px-4 py-1 rounded-full text-[10px] font-bold">ONGOING</span>
                      </td>
                      <td className="p-4 flex justify-center gap-4">
                        <Eye className="w-6 h-6 text-gray-700 cursor-pointer hover:text-blue-700" onClick={() => setView('viewOnly')} />
                        <CheckSquare className="w-6 h-6 text-gray-700 cursor-pointer hover:text-green-600" onClick={() => setView('checklist')} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- CREATE VIEW --- */}
          {view === 'create' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="bg-black text-white p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-bold uppercase tracking-tighter text-black">Weekly Meal Planner</h1>
                </div>
              </div>

              <div className="flex justify-center items-center gap-6 mb-10 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-fit mx-auto">
                <div className="flex items-center gap-2 font-bold text-sm uppercase text-black">
                  From: <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded-xl px-3 py-2 font-semibold bg-gray-50 text-black" />
                </div>
                <div className="flex items-center gap-2 font-bold text-sm uppercase text-black">
                  To: <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded-xl px-3 py-2 font-semibold bg-gray-50 text-black" />
                </div>
              </div>

              <div className="space-y-8">
                {plans.map((day, dayIdx) => (
                  <div key={dayIdx} className={`bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm transition-opacity ${day.isHoliday ? 'opacity-60' : 'opacity-100'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-black uppercase tracking-tight text-black">{day.date} ({day.dayName})</h2>
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => {
                            const updated = [...plans];
                            updated[dayIdx].isHoliday = !updated[dayIdx].isHoliday;
                            setPlans(updated);
                          }}
                          className={`w-11 h-5 rounded-full p-1 cursor-pointer flex items-center transition-all ${day.isHoliday ? 'bg-[#76ba53]' : 'bg-gray-300'}`}
                        >
                          <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${day.isHoliday ? 'translate-x-6' : ''}`} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 uppercase">Holiday</span>
                      </div>
                    </div>

                    {!day.isHoliday ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {(['Breakfast', 'Lunch', 'Snack'] as MealType[]).map((type) => (
                          <div key={type} className="border border-gray-200 rounded-3xl p-6 bg-[#fcfcfc] flex flex-col min-h-[300px]">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-black text-lg uppercase text-black">{type}</h3>
                              <PlusCircle className="w-5 h-5 text-black cursor-pointer hover:scale-110" onClick={() => handleAddItem(dayIdx, type)} />
                            </div>
                            <div className="space-y-3 flex-grow text-black">
                              {day.meals[type].items.map((item) => (
                                <div key={item.id} className="group relative flex items-center gap-2">
                                  <div className="flex-grow relative">
                                    <select 
                                      className="w-full border-2 border-black rounded-xl p-3 bg-white text-xs font-bold appearance-none pr-10 cursor-pointer text-black"
                                      value={item.name}
                                      onChange={(e) => handleMealSelection(dayIdx, type, item.id, e.target.value)}
                                    >
                                      <option disabled value="Select Meal">Select {type}</option>
                                      {MEAL_DIRECTORY_DATA.filter(m => m.category === type).map(m => (
                                        <option key={m.id} value={m.name}>{m.name} (Serves {m.size})</option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                  </div>
                                  <Trash2 className="w-5 h-5 text-gray-300 hover:text-red-500 cursor-pointer" onClick={() => handleDeleteItem(dayIdx, type, item.id)} />
                                </div>
                              ))}
                            </div>
                            <button className="w-full bg-[#0018b8] text-white text-[11px] font-black py-4 rounded-xl mt-6 uppercase tracking-widest">
                              Total Servings: {day.meals[type].items.reduce((acc, curr) => acc + curr.pax, 0)} pax
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-gray-300 font-black text-2xl italic border-4 border-dashed border-gray-50 rounded-[2rem] uppercase tracking-tighter">
                        No Daily Meal Plan
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center py-12">
                <button 
                  onClick={handleSaveWeeklyPlan}
                  disabled={isSaving}
                  className={`${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#76ba53] hover:bg-green-600'} text-white px-20 py-4 rounded-full font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 border-b-4 border-black/20`}
                >
                  {isSaving ? 'Saving...' : 'Save Weekly Plan'}
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW ONLY MODE --- */}
          {view === 'viewOnly' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black uppercase italic text-black">Plan Summary</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dateFrom} to {dateTo}</p>
                  </div>
                </div>
                <button className="bg-white border-2 border-black px-6 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-black">
                  <Printer size={16}/> Print Summary
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 text-black">
                {plans.map((day, dayIdx) => (
                  <div key={dayIdx} className={`bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${day.isHoliday ? 'opacity-40 grayscale' : ''}`}>
                    <div className="bg-[#fff9c4] border-b-2 border-black p-4 text-center">
                      <h3 className="font-black uppercase text-xs tracking-tighter text-black">{day.dayName}</h3>
                      <p className="text-[9px] font-bold text-gray-500">{day.date}</p>
                    </div>
                    <div className="p-5 space-y-5">
                      {day.isHoliday ? (
                        <div className="py-10 text-center font-black text-gray-300 uppercase italic text-sm leading-tight">Holiday</div>
                      ) : (
                        (['Breakfast', 'Lunch', 'Snack'] as MealType[]).map((type) => (
                          <div key={type}>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{type}</label>
                            <div className="space-y-1">
                              {day.meals[type].items.length > 0 ? (
                                day.meals[type].items.map((item, i) => (
                                  <div key={i} className="flex justify-between items-start">
                                    <p className="font-bold text-xs text-black leading-tight">{item.name}</p>
                                    <span className="text-[8px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{item.pax}p</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] italic text-gray-300">None</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#0018b8] text-white p-8 rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center">
                <div>
                  <h4 className="font-black uppercase text-xs tracking-[0.2em] text-blue-300 mb-1">Weekly Estimated Budget</h4>
                  <p className="text-4xl font-black italic tracking-tighter">
                    P{generateChecklist().reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setView('checklist')} className="mt-6 md:mt-0 bg-[#76ba53] border-2 border-black text-white px-10 py-4 rounded-full font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-600 transition-all active:translate-y-1 active:shadow-none">
                  Go to Grocery Checklist
                </button>
              </div>
            </div>
          )}

          {/* --- CHECKLIST VIEW --- */}
          {view === 'checklist' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="bg-black text-white p-2 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black uppercase italic text-black">Checklist</h1>
                    <p className="text-[10px] font-bold text-gray-400">DATES: {dateFrom} to {dateTo}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-black rounded-sm overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fff9c4] border-b-2 border-black text-[10px] font-black uppercase tracking-widest text-black">
                    <tr>
                      <th className="p-4 border-r-2 border-black w-12 text-center">Done</th>
                      <th className="p-4 border-r-2 border-black">Item Name</th>
                      <th className="p-4 border-r-2 border-black text-center">Category</th>
                      <th className="p-4 border-r-2 border-black text-center">Required Qty</th>
                      <th className="p-4 text-center">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold uppercase text-black">
                    {generateChecklist().map((ing, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-4 border-r-2 border-black text-center">
                          <div className="w-5 h-5 border-2 border-black mx-auto rounded-sm cursor-pointer flex items-center justify-center hover:bg-green-100">
                            <Check className="w-3 h-3 text-transparent hover:text-green-600 transition-colors" />
                          </div>
                        </td>
                        <td className="p-4 border-r-2 border-black">{ing.name}</td>
                        <td className="p-4 border-r-2 border-black text-center text-gray-500">{ing.category}</td>
                        <td className="p-4 border-r-2 border-black text-center">{ing.qty.toFixed(2)} {ing.unit}</td>
                        <td className="p-4 text-center text-blue-700">P{ing.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}