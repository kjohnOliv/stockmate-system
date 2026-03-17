"use client";
import React, { useState, useEffect } from 'react';
import { 
  Users, Package, AlertTriangle, TrendingUp, 
  Clock, Calendar as CalendarIcon, ChevronRight, ArrowUpRight, Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if not logged in (Basic client-side guard)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbe9]">
        <Loader2 className="animate-spin text-[#6BCB3B]" size={40} />
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: "12", icon: <Users size={24}/>, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Items", value: "148", icon: <Package size={24}/>, color: "text-[#6BCB3B]", bg: "bg-green-50" },
    { label: "Low Stock", value: "5", icon: <AlertTriangle size={24}/>, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Monthly Growth", value: "+12.5%", icon: <TrendingUp size={24}/>, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#fdfbe9] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">
            HELLO, <span className="text-[#6BCB3B]">{user?.username || "USER"}</span>!
          </h1>
          <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-[0.2em]">
            System Overview & Quick Stats
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white border-4 border-[#F3EBC7] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm min-w-[160px]">
            <Clock className="text-[#6BCB3B]" size={20} />
            <span className="font-black text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="bg-white border-4 border-[#F3EBC7] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <CalendarIcon className="text-[#6BCB3B]" size={20} />
            <span className="font-black text-slate-700">
              {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white border-4 border-[#F3EBC7] p-6 rounded-[32px] shadow-xl shadow-slate-200/50 hover:scale-[1.02] transition-transform cursor-default group">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border-4 border-[#F3EBC7] rounded-[40px] p-8 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Recent Activity</h2>
            <button className="text-[10px] font-black text-[#6BCB3B] uppercase tracking-widest flex items-center gap-1 hover:underline">
              View All <ChevronRight size={14}/>
            </button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border-2 border-slate-100 hover:border-[#6BCB3B]/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm uppercase">Stock Updated: Lunch Meals</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">By Staff • 2 mins ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-green-500 font-black text-xs">
                  <ArrowUpRight size={14}/> +20
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#6BCB3B] rounded-[40px] p-8 shadow-xl shadow-green-200/50 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Stock Tip</h2>
            <p className="font-bold text-green-50 leading-relaxed text-sm">
              "Keep an eye on the <b>Low Stock</b> alerts. Reordering before you hit zero ensures the canteen never stops serving!"
            </p>
            <button className="mt-8 bg-white text-[#6BCB3B] px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-50 transition-colors shadow-lg">
              Check Inventory
            </button>
          </div>
          <Package size={120} className="absolute -bottom-4 -right-4 text-white/10 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </div>
    </div>
  );
}