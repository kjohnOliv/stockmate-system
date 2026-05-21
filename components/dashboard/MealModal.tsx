"use client";

import React from "react";
import { Trash2, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";

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
  setIsNewIngModalOpen,
}: MealModalProps) {
  const handleIngredientChange = (idx: number, field: keyof Ingredient, value: number) => {
    const updatedIngs = [...formData.ingredients];
    updatedIngs[idx] = { ...updatedIngs[idx], [field]: value };
    setFormData({ ...formData, ingredients: updatedIngs });
  };

  const handleSelectInventory = (idx: number, invId: string) => {
    const selectedItem = inventory.find((item) => item.id === parseInt(invId));
    const updatedIngs = [...formData.ingredients];
    if (selectedItem) {
      updatedIngs[idx] = {
        ...updatedIngs[idx],
        inventoryId: selectedItem.id,
        unit: selectedItem.unit,
        itemName: selectedItem.item,
      };
    } else {
      updatedIngs[idx] = { ...updatedIngs[idx], inventoryId: null, unit: "" };
    }
    setFormData({ ...formData, ingredients: updatedIngs });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden border border-emerald-100 bg-white p-0 shadow-[0_24px_60px_rgba(47,111,79,0.18)]">
        <DialogHeader className="border-b border-emerald-100 bg-[linear-gradient(90deg,_#fff6c7_0%,_#f5f9dc_50%,_#edf8ea_100%)] p-8">
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            {formData.id ? "Edit Recipe" : "New Meal Recipe"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Meal Name</Label>
              <Input
                className="font-bold"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Category</Label>
              <AppSelect
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                className="font-bold"
                options={[
                  { label: "Breakfast", value: "Breakfast" },
                  { label: "Lunch", value: "Lunch" },
                  { label: "Dinner", value: "Dinner" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-100 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Ingredients</h4>
              <Button
                variant="link"
                onClick={() => setIsNewIngModalOpen(true)}
                className="h-auto p-0 text-[10px] font-black uppercase text-blue-600"
              >
                <PlusCircle size={14} className="mr-1" /> Not in Inventory?
              </Button>
            </div>

            {formData.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <AppSelect
                  value={String(ing.inventoryId || "")}
                  onValueChange={(value) => handleSelectInventory(idx, value)}
                  className="flex-1 border-0 bg-transparent px-2 py-2 font-bold shadow-none"
                  placeholder="Select Item"
                  options={[
                    { label: "Select Item", value: "" },
                    ...inventory.map((item) => ({ label: item.item, value: String(item.id) })),
                  ]}
                />

                <Input
                  type="number"
                  className="w-24 font-black text-blue-600"
                  placeholder="Qty"
                  value={ing.qty || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIngredientChange(idx, "qty", parseFloat(e.target.value))}
                />

                <div className="w-12 text-center text-[10px] font-black uppercase text-slate-400">
                  {ing.unit || "---"}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const updated = formData.ingredients.filter((_, i) => i !== idx);
                    setFormData({ ...formData, ingredients: updated });
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() => setFormData({ ...formData, ingredients: [...formData.ingredients, { inventoryId: null, qty: 0, unit: "" }] })}
              className="w-full border-dashed text-xs font-bold uppercase"
            >
              + Add Ingredient Row
            </Button>
          </div>
        </div>

        <div className="flex gap-4 border-t border-slate-100 bg-slate-50 p-8">
          <Button onClick={handleSaveMeal} className="h-12 w-full font-black uppercase">
            Confirm & Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
