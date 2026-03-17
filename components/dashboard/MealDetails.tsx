"use client";

import React from 'react';
import { X, Trash2, Utensils, Users, AlertCircle } from 'lucide-react';

// --- INTERFACES ---
// We define these here so the component knows what data to expect
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
  paxSize: number;
  allergens: string;
  ingredients: Ingredient[];
}

interface MealDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Meal | null;
  onEdit: (meal: Meal) => void;
  onDelete: (id: number) => void;
}

export default function MealDetails({ 
  isOpen, 
  onClose, 
  recipe, 
  onEdit, 
  onDelete 
}: MealDetailsProps) {
  
  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[40px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b-4 border-black bg-[#FFF9C4] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Utensils size={24} />
            <h2 className="text-xl font-black italic uppercase tracking-tight">Recipe Details</h2>
          </div>
          <button 
            onClick={onClose}
            className="hover:rotate-90 transition-transform p-1"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black uppercase mb-2">{recipe.name}</h1>
            <div className="flex gap-4">
              <span className="bg-blue-100 border-2 border-black px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {recipe.category}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
                <Users size={14} /> {recipe.paxSize} PAX
              </span>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mb-8">
            <h3 className="font-black uppercase italic underline mb-4">Ingredients List</h3>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex justify-between border-b-2 border-slate-100 pb-2 font-bold text-sm">
                  <span>{ing.itemName || "Unknown Item"}</span>
                  <span className="text-[#76ba53]">{ing.qty} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allergens */}
          {recipe.allergens && (
            <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase text-red-400 leading-none mb-1">Allergen Alert</p>
                <p className="text-red-700 font-bold text-sm uppercase">{recipe.allergens}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t-4 border-black bg-slate-50 flex gap-4">
          <button 
            onClick={() => recipe.id && onDelete(recipe.id)}
            className="flex items-center gap-2 text-red-500 font-black uppercase text-xs hover:bg-red-100 p-3 rounded-xl transition-colors"
          >
            <Trash2 size={18} /> Delete
          </button>

          <button 
            onClick={() => onEdit(recipe)}
            className="flex-1 bg-black text-white p-4 rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(118,186,83,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            Edit Recipe
          </button>
        </div>
      </div>
    </div>
  );
}