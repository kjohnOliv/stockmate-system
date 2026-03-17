"use client";

import React from 'react';
import { X, Trash2, PlusCircle } from 'lucide-react';
// Corrected imports - Ensure these are installed via: 
// npx shadcn-ui@latest add dialog button input label
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface InventoryItem {
  id: number;
  item: string;
  unit: string;
}

interface MealModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Meal;
  setFormData: React.Dispatch<React.SetStateAction<Meal>>;
  inventory: InventoryItem[];
  handleSaveMeal: () => Promise<void>;
  setIsNewIngModalOpen: (open: boolean) => void;
}

export default function MealModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  inventory,
  handleSaveMeal,
  setIsNewIngModalOpen
}: MealModalProps) {

  const handleIngredientChange = (idx: number, field: keyof Ingredient, value: any) => {
    const updatedIngs = [...formData.ingredients];
    updatedIngs[idx] = { ...updatedIngs[idx], [field]: value };
    setFormData({ ...formData, ingredients: updatedIngs });
  };

  const handleSelectInventory = (idx: number, invId: string) => {
    const selectedItem = inventory.find(item => item.id === parseInt(invId));
    const updatedIngs = [...formData.ingredients];
    if (selectedItem) {
      updatedIngs[idx] = {
        ...updatedIngs[idx],
        inventoryId: selectedItem.id,
        unit: selectedItem.unit,
        itemName: selectedItem.item
      };
    } else {
      updatedIngs[idx] = { ...updatedIngs[idx], inventoryId: null, unit: '' };
    }
    setFormData({ ...formData, ingredients: updatedIngs });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-2 border-black p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 bg-slate-50 border-b-2 border-black">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
            {formData.id ? 'Edit Recipe' : 'New Meal Recipe'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 overflow-y-auto max-h-[70vh] space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase">Meal Name</Label>
              <Input 
                className="border-2 border-black font-bold"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase">Category</Label>
              <select 
                className="w-full border-2 border-black p-2 rounded-md font-bold h-10"
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, category: e.target.value})}
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end border-b-2 border-slate-100 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Ingredients</h4>
              <Button 
                variant="link"
                onClick={() => setIsNewIngModalOpen(true)}
                className="text-blue-600 font-black text-[10px] uppercase p-0 h-auto"
              >
                <PlusCircle size={14} className="mr-1"/> Not in Inventory?
              </Button>
            </div>

            {formData.ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                <select 
                  className="flex-1 bg-transparent px-2 py-2 font-bold outline-none"
                  value={ing.inventoryId || ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectInventory(idx, e.target.value)}
                >
                  <option value="">Select Item</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.item}</option>
                  ))}
                </select>

                <Input 
                  type="number"
                  className="w-24 border-2 border-slate-200 font-black text-blue-600"
                  placeholder="Qty"
                  value={ing.qty || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIngredientChange(idx, 'qty', parseFloat(e.target.value))}
                />

                <div className="w-12 text-center font-black text-slate-400 text-[10px] uppercase">
                  {ing.unit || "---"}
                </div>

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const updated = formData.ingredients.filter((_, i) => i !== idx);
                    setFormData({...formData, ingredients: updated});
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16}/>
                </Button>
              </div>
            ))}

            <Button 
              variant="outline"
              onClick={() => setFormData({...formData, ingredients: [...formData.ingredients, { inventoryId: null, qty: 0, unit: '' }]})}
              className="w-full border-dashed border-2 font-bold text-xs uppercase"
            >
              + Add Ingredient Row
            </Button>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex gap-4">
          <Button 
            onClick={handleSaveMeal}
            className="w-full py-6 font-black uppercase text-white bg-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(118,186,83,1)] hover:translate-y-1 hover:shadow-none transition-all"
          >
            Confirm & Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}