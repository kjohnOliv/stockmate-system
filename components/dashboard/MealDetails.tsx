"use client";

import React from 'react';
import { 
  X, Utensils, Scale, AlertCircle, Edit3 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

export default function MealDetails({ isOpen, onClose, recipe, onEdit }: MealDetailsProps) {
  if (!recipe) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[2rem] p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-blue-600 text-white border-b-4 border-black">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge variant="outline" className="bg-white text-blue-600 border-2 border-black font-black uppercase text-[10px]">
                {recipe.category}
              </Badge>
              <DialogTitle className="text-4xl font-black uppercase tracking-tighter italic">
                {recipe.name}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => onEdit(recipe)}
              className="bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all font-black text-xs uppercase"
            >
              <Edit3 size={16} className="mr-2" /> Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border-2 border-black rounded-2xl bg-slate-50 flex items-center gap-4">
              <div className="p-3 bg-blue-100 border-2 border-black rounded-xl">
                <Scale size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Base Pax Size</p>
                <p className="text-xl font-black">{recipe.paxSize} People</p>
              </div>
            </div>
            <div className="p-4 border-2 border-black rounded-2xl bg-orange-50 flex items-center gap-4">
              <div className="p-3 bg-orange-100 border-2 border-black rounded-xl">
                <AlertCircle size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Allergen Info</p>
                <p className="text-sm font-bold">{recipe.allergens || "None Listed"}</p>
              </div>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="space-y-4">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Utensils size={20} /> Required Ingredients
            </h3>
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border-2 border-slate-100 rounded-xl hover:border-black transition-colors group">
                    <span className="font-bold text-slate-700 group-hover:text-black">
                      {ing.itemName || "Unknown Item"}
                    </span>
                    <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                      {ing.qty} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t-4 border-black flex justify-end">
          <Button 
            onClick={onClose}
            className="bg-black text-white px-8 py-6 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            Close Recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}