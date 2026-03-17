"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Utensils, Clock, MapPin } from 'lucide-react';

interface MealItem {
  name: string;
  pax: number;
}

interface MealCategory {
  items: MealItem[];
}

interface DayPlan {
  date: string;
  dayName: string;
  isHoliday: boolean;
  meals: {
    Breakfast: MealCategory;
    Lunch: MealCategory;
    Snack: MealCategory;
  };
}

export default function StudentActiveMenu() {
  const [activePlan, setActivePlan] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the published plan from your Go backend
    fetch('http://localhost:8080/api/meal-plans/active')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          // In your admin code, plan_data is the whole 'plans' array
          setActivePlan(res.data.plan_data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching student menu:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <Utensils className="w-12 h-12 text-blue-500 mb-4" />
          <p className="text-gray-500 font-medium">Loading today's menu...</p>
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-10 rounded-3xl shadow-sm border border-gray-100 max-w-md">
          <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Menu Published</h2>
          <p className="text-gray-500">Check back later for this week's meal schedule!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Header Section */}
      <div className="bg-[#0018b8] text-white pt-16 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Campus Canteen</h1>
          <div className="flex items-center gap-4 text-blue-200 text-sm font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1"><Clock size={16}/> Serving Weekly</span>
            <span className="flex items-center gap-1"><MapPin size={16}/> Main Hall</span>
          </div>
        </div>
      </div>

      {/* Menu Cards Section */}
      <div className="max-w-5xl mx-auto px-6 -mt-12">
        <div className="space-y-8">
          {activePlan.map((day, idx) => (
            <div key={idx} className={`bg-white rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-black/5 transition-all ${day.isHoliday ? 'bg-gray-50 opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row">
                
                {/* Date Sidebar */}
                <div className="bg-[#fff9c4] md:w-48 p-8 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-gray-100">
                  <span className="text-blue-600 font-black text-4xl mb-1">{day.date.split(' ')[1].replace(',', '')}</span>
                  <span className="text-gray-800 font-black uppercase text-xs tracking-widest">{day.dayName}</span>
                </div>

                {/* Meals Content */}
                <div className="flex-grow p-8">
                  {day.isHoliday ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-2xl font-black text-gray-300 uppercase italic">Canteen Closed - Holiday</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {(['Breakfast', 'Lunch', 'Snack'] as const).map((type) => (
                        <div key={type}>
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">{type}</h4>
                          <div className="space-y-3">
                            {day.meals[type].items.length > 0 ? (
                              day.meals[type].items.map((item, i) => (
                                <div key={i} className="group">
                                  <p className="font-bold text-gray-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                                    {item.name}
                                  </p>
                                  <div className="h-1 w-8 bg-gray-100 mt-2 rounded-full"></div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-300 italic text-sm">Not scheduled</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-5xl mx-auto px-6 mt-12 text-center">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
          Menu subject to change based on ingredient availability.
        </p>
      </div>
    </div>
  );
}