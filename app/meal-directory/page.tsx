"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, Trash2, PlusCircle, Search, Utensils, Filter
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label"; 
import MealDetails from "@/components/dashboard/MealDetails";
import RoleGuard from '../../components/auth/RoleGuard';

// --- 1. INTERFACES (Moved to top to prevent 'Cannot find name' errors) ---
interface InventoryItem {
  id: number;
  item: string; 
  unit: string;
}

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

export default function MealDirectory() {
  const { user } = useAuth();
  
  // Data States
  const [meals, setMeals] = useState<Meal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewIngModalOpen, setIsNewIngModalOpen] = useState(false);
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [formData, setFormData] = useState<Meal>({
    name: '', category: 'Lunch', paxSize: 50, allergens: '',
    ingredients: []
  });

  const [newInvItem, setNewInvItem] = useState({ 
    item: '', category: 'Meat', unit: 'kg', threshold: 10, current_qty: 0, price: 0 
  });

  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  // --- 2. IMPROVED FETCH DATA ---
  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/inventory');
      if (!res.ok) throw new Error('Inventory fetch failed');
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const fetchMeals = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/recipes');
      if (!res.ok) throw new Error('Recipes fetch failed');
      const data = await res.json();
      const mealData = Array.isArray(data) ? data : [];
      setMeals(mealData);
      setFilteredMeals(mealData);
    } catch (err) {
      console.error("Failed to load meals:", err);
    }
  };

  useEffect(() => { 
    fetchInventory(); 
    fetchMeals();
  }, []);

  // --- 3. SEARCH & FILTER LOGIC ---
  useEffect(() => {
    let result = [...meals];
    if (categoryFilter !== "All") {
      result = result.filter(m => m.category === categoryFilter);
    }
    if (searchQuery) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredMeals(result);
  }, [searchQuery, categoryFilter, meals]);

  // --- 4. HANDLERS ---
  const handleIngredientSelect = (idx: number, invId: string) => {
    const updatedIngs = [...formData.ingredients];
    if (invId === "") {
      updatedIngs[idx] = { ...updatedIngs[idx], inventoryId: null, unit: '' };
    } else {
      const selectedItem = inventory.find(item => item.id === parseInt(invId));
      if (selectedItem) {
        updatedIngs[idx] = {
          ...updatedIngs[idx],
          inventoryId: selectedItem.id,
          unit: selectedItem.unit,
          itemName: selectedItem.item
        };
      }
    }
    setFormData({ ...formData, ingredients: updatedIngs });
  };

  const openEditModal = (meal: Meal) => {
    setViewingMeal(null);
    setFormData({...meal}); // Spread to create a fresh copy
    setIsModalOpen(true);
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-screen bg-[#F3F4F6] p-8 text-slate-800">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic">Meal Directory</h1>
              <p className="text-slate-500 font-bold">Standardized Recipes & Scaling</p>
            </div>
            {canEdit && (
              <button 
                onClick={() => {
                  setFormData({ name: '', category: 'Lunch', paxSize: 50, allergens: '', ingredients: [{ inventoryId: null, qty: 0, unit: '' }] });
                  setIsModalOpen(true);
                }} 
                className="bg-[#76ba53] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:translate-y-1 hover:shadow-none transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Add Meal
              </button>
            )}
          </header>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search recipes..."
                className="w-full pl-12 pr-4 py-4 border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white border-2 border-black px-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Filter size={18} />
              <select 
                className="py-4 font-black uppercase text-xs outline-none bg-transparent"
                value={categoryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
          </div>

          {/* ... Table and MealDetails Modal ... */}
          <MealDetails 
            isOpen={!!viewingMeal}
            onClose={() => setViewingMeal(null)}
            recipe={viewingMeal}
            onEdit={openEditModal}
          />
        </div>
      </div>
    </RoleGuard>
  );
}