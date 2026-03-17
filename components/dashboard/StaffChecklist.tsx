"use client";
import React from "react";

interface StaffChecklistProps {
  activePlanId: number;
}

export default function StaffChecklist({ activePlanId }: StaffChecklistProps) {
  return (
    <div className="p-6 border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
      <h2 className="text-xl font-black uppercase italic mb-4">
        Prep Checklist
      </h2>

      <p className="text-sm font-bold mb-4">
        Meal Plan ID: <span className="font-black">#{activePlanId}</span>
      </p>

      {/* Example Checklist */}
      <ul className="space-y-2">
        <li className="flex items-center gap-2">
          <input type="checkbox" />
          <span>Prepare vegetables</span>
        </li>

        <li className="flex items-center gap-2">
          <input type="checkbox" />
          <span>Measure ingredients</span>
        </li>

        <li className="flex items-center gap-2">
          <input type="checkbox" />
          <span>Check stock availability</span>
        </li>
      </ul>
    </div>
  );
}