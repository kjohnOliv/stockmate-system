"use client";

import React from 'react';
import { X, Trash2, Utensils, Users, AlertCircle } from 'lucide-react';

// --- INTERFACES ---
interface Ingredient {
  inventoryId: number | null;
  itemName?: string;
  qty: number;
  unit: string;
}

interface Meal {
  id?: number | null;
  name: string;
  category: string;
  paxSize?: number;  // Optional to handle both naming conventions
  pax_size?: number; // Added to match Go backend naming
  allergens: string;
  ingredients: Ingredient[];
}

interface MealDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Meal | null;
  onEdit: (meal: Meal) => void;
  onDelete: (id: number) => void;
  canManage?: boolean;
}

export default function MealDetails({ 
  isOpen, 
  onClose, 
  recipe, 
  onEdit, 
  onDelete,
  canManage = true,
}: MealDetailsProps) {
  
  if (!isOpen || !recipe) return null;

  // Helper to get the correct serving size regardless of the field name
  const displayPax = recipe.paxSize || recipe.pax_size || 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(47,111,79,0.18)]">
        
        {/* Header */}
        <div className="table-header-emerald flex items-center justify-between border-b border-emerald-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2f6f4f] shadow-sm">
              <Utensils size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Recipe Details</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f6f4f]">Meal Directory</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
          >
            <X size={22} strokeWidth={2.6} />
          </button>
        </div>

        {/* Content */}
        <div className="hidden-scrollbar max-h-[70vh] overflow-y-auto p-8">
          <div className="mb-8">
            <h1 className="mb-3 text-4xl font-black leading-none text-slate-900">{recipe.name}</h1>
            <div className="mt-3 flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase text-[#2f6f4f]">
                {recipe.category}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-4 py-1.5 text-[10px] font-black uppercase text-slate-500">
                <Users size={14} /> {displayPax} PAX
              </span>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mb-8">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#2f6f4f]">Ingredients List</h3>
            <div className="space-y-2">
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold">
                    <span className="text-slate-800">{ing.itemName || "Unknown Item"}</span>
                    <span className="text-[#2f6f4f]">{ing.qty} {ing.unit}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-sm">No ingredients listed.</p>
              )}
            </div>
          </div>

          {/* Allergens */}
          {recipe.allergens && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Allergen Alert</p>
                <p className="text-sm font-bold uppercase text-red-700">{recipe.allergens}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 border-t border-emerald-100 bg-slate-50 p-6">
          {canManage ? (
            <>
              <button 
                type="button"
                onClick={() => recipe.id && onDelete(recipe.id)}
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase text-red-500 transition-colors hover:bg-red-100"
              >
                <Trash2 size={18} /> Delete
              </button>

              <button 
                type="button"
                onClick={() => onEdit(recipe)}
                className="flex-1 rounded-2xl bg-[#2f6f4f] p-4 text-xs font-black uppercase text-white transition hover:bg-[#285f44]"
              >
                Edit Recipe
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[#2f6f4f] p-4 text-xs font-black uppercase text-white transition hover:bg-[#285f44]"
            >
              Close Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
