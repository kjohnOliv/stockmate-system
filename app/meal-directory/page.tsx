"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, PlusCircle, Search, Trash, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label"; 
import MealDetails from "@/components/dashboard/MealDetails";
import RoleGuard from '../../components/auth/RoleGuard';
import { ApiClient } from "@/lib/api";

// --- INTERFACES ---
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
  pax_size?: number; 
  allergens: string;
  ingredients: Ingredient[];
}

export default function MealDirectory() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const initialForm: Meal = {
    name: '', 
    category: 'Lunch', 
    paxSize: 50, 
    allergens: '',
    ingredients: [{ inventoryId: null, qty: 0, unit: '' }]
  };

  const [formData, setFormData] = useState<Meal>(initialForm);

  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  // --- FETCH DATA (FIXED LOGIC) ---
  const fetchInventory = async () => {
    try {
      const res = await ApiClient.get("/api/inventory");
      if (res.ok) {
        const json = await res.json();
        const data = json?.success ? json.data : [];
        setInventory(Array.isArray(data) ? data : []);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.error("Inventory fetch failed", err);
      setInventory([]);
    }
  };

  const fetchMeals = async () => {
    try {
      const res = await ApiClient.get("/api/recipes");
      if (res.ok) {
        const json = await res.json();
        const rawData = json?.success ? json.data : [];

        if (Array.isArray(rawData)) {
          const normalizedData = rawData.map((m: unknown) => {
            const meal = m as Meal & { pax_size?: number };
            return {
              ...meal,
              // Handle Go backend field naming vs Frontend interface
              paxSize: meal.paxSize ?? meal.pax_size ?? 0
            };
          });
          setMeals(normalizedData);
        } else {
          setMeals([]);
        }
      } else {
        setMeals([]);
      }
    } catch (err) {
      console.error("Recipes fetch failed", err);
      setMeals([]);
    }
  };

  useEffect(() => { 
    queueMicrotask(() => {
      fetchInventory(); 
      fetchMeals();
    });
  }, []);

  // --- SEARCH & FILTER LOGIC ---
  useEffect(() => {
    let result = [...meals];
    if (categoryFilter !== "All") result = result.filter(m => m.category === categoryFilter);
    if (searchQuery) result = result.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilteredMeals(result);
    setCurrentPage(1); 
  }, [searchQuery, categoryFilter, meals]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMeals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMeals.length / itemsPerPage);

  // --- HANDLERS ---
  const handleIngredientSelect = (idx: number, invId: string) => {
    const updatedIngs = [...formData.ingredients];
    if (invId === "") {
      updatedIngs[idx] = { inventoryId: null, qty: 0, unit: '' };
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

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validIngredients = formData.ingredients.filter(ing => ing.inventoryId !== null);
    if (validIngredients.length === 0) {
      alert("Please add at least one valid ingredient.");
      return;
    }

    try {
      // Ensure we send numeric values to Go backend
      const payload = {
        ...formData,
        ingredients: validIngredients,
        paxSize: Number(formData.paxSize),
        // Providing both names ensures backend compatibility
        pax_size: Number(formData.paxSize)
      };

      if (formData.id) {
        await ApiClient.put(`/api/recipes/${formData.id}`, payload);
      } else {
        await ApiClient.post("/api/recipes", payload);
      }

      setIsModalOpen(false);
      fetchMeals();
    } catch (err) {
      console.error("Save meal failed", err);
      alert("Failed to save meal recipe.");
    }
  };

  const handleDeleteMeal = async (id: number) => {
    if (!window.confirm("Delete this recipe permanently?")) return;
    try {
      await ApiClient.delete(`/api/recipes/${id}`);
      fetchMeals();
      setViewingMeal(null);
    } catch {
      alert("Error deleting recipe.");
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-screen bg-[#F3F4F6] p-8 text-slate-800">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Meal Directory</h1>
              <p className="text-slate-500 font-medium italic mt-2">Standardized Recipes & Scaling</p>
            </div>
            {canEdit && (
              <button 
                onClick={() => { setFormData(initialForm); setIsModalOpen(true); }} 
                className="bg-[#76ba53] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={18} strokeWidth={3} /> Add Meal
              </button>
            )}
          </header>

          {/* Search/Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#76ba53] outline-none font-bold bg-white"
                placeholder="Search by meal name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="border-2 border-slate-200 rounded-2xl px-4 py-3 bg-white font-bold outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mt-8">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-[#fff9c4] border-b border-slate-200 text-[11px] uppercase font-black text-slate-600">
                    <tr>
                    <th className="p-5 text-center w-20">Meal #</th>
                    <th className="p-5">Meal Name</th>
                    <th className="p-5 text-center">Category</th>
                    <th className="p-5 text-center">Serving Size</th>
                    <th className="p-5 text-center">Ingredients</th>
                    <th className="p-5">Allergens</th>
                    </tr>
                </thead>
                <tbody className="font-bold text-sm uppercase">
                    {currentItems.length > 0 ? (
                    currentItems.map((meal, index) => (
                        <tr 
                          key={meal.id || index} 
                          onClick={() => setViewingMeal(meal)} 
                          className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                        <td className="p-5 text-center text-slate-400 italic">{indexOfFirstItem + index + 1}</td>
                        <td className="p-5 font-black text-slate-800">{meal.name}</td>
                        <td className="p-5 text-center text-slate-500">{meal.category}</td>
                        <td className="p-5 text-center text-slate-700">{meal.paxSize || meal.pax_size} PAX</td>
                        <td className="p-5 text-center text-slate-700">{meal.ingredients?.length || 0}</td>
                        <td className="p-5 text-red-500 text-[11px] font-bold truncate max-w-[200px]">{meal.allergens || 'None'}</td>
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan={6} className="p-20 text-center bg-white"><p className="font-bold text-slate-400">No recipes found.</p></td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-between items-center">
            <p className="text-[10px] font-black uppercase text-slate-400">Showing {currentItems.length} of {filteredMeals.length} Results</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="w-10 h-10 border-2 border-slate-300 rounded-xl flex items-center justify-center bg-white disabled:opacity-30 text-slate-400"><ChevronLeft size={20} /></button>
              <div className="flex items-center px-4 font-black text-sm text-slate-700">{currentPage} / {totalPages || 1}</div>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="w-10 h-10 border-2 border-slate-300 rounded-xl flex items-center justify-center bg-white disabled:opacity-30 text-slate-400"><ChevronRight size={20} /></button>
            </div>
          </div>

          {/* Form Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase text-slate-800">{formData.id ? 'Edit' : 'Add New'} Meal Recipe</h2>
                  <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveMeal} className="p-8 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="col-span-2">
                      <Label className="font-black uppercase text-[10px]">Meal Name</Label>
                      <input required className="w-full border p-3 rounded-xl font-bold border-slate-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <Label className="font-black uppercase text-[10px]">Category</Label>
                      <select className="w-full border p-3 rounded-xl font-bold border-slate-200" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Breakfast</option>
                        <option>Lunch</option>
                        <option>Dinner</option>
                        <option>Snack</option>
                      </select>
                    </div>
                    <div>
                      <Label className="font-black uppercase text-[10px]">Serving Size (Pax)</Label>
                      <input type="number" className="w-full border p-3 rounded-xl font-bold border-slate-200" value={formData.paxSize} onChange={e => setFormData({...formData, paxSize: parseInt(e.target.value)})} />
                    </div>
                    <div className="col-span-2">
                      <Label className="font-black uppercase text-[10px]">Allergens</Label>
                      <input className="w-full border p-3 rounded-xl font-bold border-slate-200" placeholder="e.g. Soy, Nuts" value={formData.allergens} onChange={e => setFormData({...formData, allergens: e.target.value})} />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black uppercase text-slate-800">Ingredients</h3>
                      <button type="button" onClick={() => setFormData({...formData, ingredients: [...formData.ingredients, {inventoryId: null, qty: 0, unit: ''}]})} className="text-green-600 font-black flex items-center gap-1 text-xs"><PlusCircle size={16} /> Add Row</button>
                    </div>
                    {formData.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-3 mb-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <select required className="w-full border p-2 rounded-lg font-bold text-xs border-slate-200" value={ing.inventoryId || ""} onChange={(e) => handleIngredientSelect(idx, e.target.value)}>
                            <option value="">Select Item</option>
                            {inventory.map(item => <option key={item.id} value={item.id}>{item.item}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <input type="number" step="any" required className="w-full border p-2 rounded-lg font-bold text-xs border-slate-200" value={ing.qty} onChange={e => { const updated = [...formData.ingredients]; updated[idx].qty = parseFloat(e.target.value) || 0; setFormData({...formData, ingredients: updated}); }} />
                        </div>
                        <div className="w-12 text-[10px] font-black uppercase text-slate-400 pb-3">{ing.unit || '-'}</div>
                        <button type="button" onClick={() => setFormData({...formData, ingredients: formData.ingredients.filter((_, i) => i !== idx)})} className="pb-2 text-red-500"><Trash size={18}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 sticky bottom-0 bg-white pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-slate-200 p-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-100">Cancel</button>
                    <button type="submit" className="flex-1 bg-[#76ba53] p-4 rounded-2xl font-black uppercase text-xs text-white shadow-sm hover:bg-green-600">Save Recipe</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <MealDetails 
            isOpen={!!viewingMeal} 
            onClose={() => setViewingMeal(null)} 
            recipe={viewingMeal} 
            onEdit={(meal) => { 
              setViewingMeal(null); 
              setFormData({...meal, paxSize: meal.paxSize || meal.pax_size || 50}); 
              setIsModalOpen(true); 
            }} 
            onDelete={handleDeleteMeal} 
          />
        </div>
      </div>
    </RoleGuard>
  );
}
