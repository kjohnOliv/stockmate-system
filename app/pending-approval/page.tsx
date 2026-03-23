"use client";

import Link from "next/link";
import { Clock, ArrowLeft, ShieldCheck } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-lg text-center">
        {/* Icon Header */}
        <div className="relative inline-block mb-6">
          <div className="bg-[#6BCB3B] p-5 rounded-3xl border border-slate-200 inline-flex shadow-sm">
            <Clock size={48} className="text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
            <ShieldCheck size={24} className="text-[#2D3142]" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-[#2D3142] uppercase italic tracking-tighter leading-none mb-4">
          Wait a Minute!
        </h1>
        
        <div className="space-y-4 text-left bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8">
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Account Status: <span className="text-orange-500">Pending Approval</span></p>
          <p className="text-sm font-bold text-[#2D3142] leading-relaxed">
            Your registration was successful, but a System Admin needs to review and approve your account before you can access the dashboard.
          </p>
          <p className="text-[11px] font-bold text-slate-400 uppercase italic">
            This usually takes less than 24 hours. You will be able to log in once your status is updated to &quot;Approved&quot;.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            href="/login" 
            className="w-full bg-[#2D3142] text-white py-4 rounded-2xl font-black uppercase text-sm shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>
          
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">
            StockMate Canteen Inventory System
          </p>
        </div>
      </div>
    </div>
  );
}
