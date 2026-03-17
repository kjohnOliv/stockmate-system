"use client";
import Link from "next/link";
import { Clock, ShieldCheck, ArrowLeft } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border-4 border-[#F3EBC7] animate-in fade-in zoom-in duration-500">
        
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-[#6BCB3B]/10 rounded-full animate-ping" />
          <div className="relative bg-white border-4 border-[#6BCB3B] rounded-full w-full h-full flex items-center justify-center text-[#6BCB3B]">
            <Clock size={40} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-[#2D3142] tracking-tight uppercase mb-2">
          Verification in Progress
        </h1>
        <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-8">
          StockMate Security Protocol
        </p>

        <div className="space-y-6 text-left bg-[#fdfbe9]/50 p-6 rounded-[2rem] border-2 border-[#F3EBC7] mb-8">
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#6BCB3B]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-black text-xs uppercase text-slate-700">Admin Review Required</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Your account is currently in the queue. An administrator needs to assign your role (Staff, Cook, or Admin) before you can access the dashboard.
              </p>
            </div>
          </div>
        </div>

        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">
          You will receive access once your account is toggled to "Active".
        </p>

        <Link href="/login">
          <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95">
            <ArrowLeft size={18} />
            Back to Login
          </button>
        </Link>
      </div>
    </div>
  );
}