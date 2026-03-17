"use client";
import React, { useState } from 'react';
import StaffChecklist from './StaffChecklist';

interface StaffViewProps {
  hasActivePlan: boolean;
  activePlanId: number; 
}

export default function StaffView({ hasActivePlan, activePlanId }: StaffViewProps) {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <div className="space-y-8">
      {/* Grid container for the top action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Main Action Card: Prep Operations */}
        <div className={`relative p-8 border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all ${
          hasActivePlan ? 'bg-white' : 'bg-gray-100 opacity-60 grayscale'
        }`}>
          <div className="flex justify-between items-start">
            <h3 className="font-black italic uppercase text-2xl text-black leading-none">
              Prep Operations
            </h3>
            <div className="text-3xl">{hasActivePlan ? "🔪" : "🔒"}</div>
          </div>
          
          {!hasActivePlan ? (
            <div className="mt-6 p-4 bg-red-100 border-4 border-black inline-block">
              <p className="text-xs font-black text-red-600 uppercase italic">
                System Locked: No active plan found
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Current Plan ID: <span className="text-black font-black">#{activePlanId}</span>
              </p>
              <button 
                onClick={() => setShowChecklist(!showChecklist)}
                className={`w-full py-4 font-black uppercase italic text-sm transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 ${
                  showChecklist ? 'bg-[#facc15] text-black' : 'bg-black text-white'
                }`}
              >
                {showChecklist ? "CLOSE PREP LIST" : "OPEN PREP LIST"}
              </button>
            </div>
          )}
        </div>

        {/* Info Card: Staff Note */}
        <div className="relative p-8 border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#facc15]">
          <h3 className="font-black italic uppercase text-2xl text-black leading-none">
            Staff Note
          </h3>
          <p className="mt-4 font-bold uppercase text-xs leading-relaxed text-black">
            Please ensure all ingredients are checked off before marking the service as completed. 
            This updates the inventory in real-time.
          </p>
          {/* Decorative Background Text */}
          <div className="absolute -bottom-2 -right-2 text-black/10 text-6xl font-black italic pointer-events-none uppercase">
            INFO
          </div>
        </div>
      </div>

      {/* Checklist Section: Only visible when toggled and a plan exists */}
      {showChecklist && activePlanId && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <StaffChecklist activePlanId={activePlanId} />
        </div>
      )}
    </div>
  );
}