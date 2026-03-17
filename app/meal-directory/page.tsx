"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, Trash2, PlusCircle, Search, Utensils, Filter, Trash, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label"; 
import MealDetails from "@/components/dashboard/MealDetails";
import RoleGuard from '../../components/auth/RoleGuard';
import axios from 'axios';

// --- INTERFACES ---
interface InventoryItem {
  id: number;
  item: string; 
  unit: string;
}

interface Ingredient {
  inventoryId: number | null; 
  itemName?: string; // For display
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
  const [meals, setMeals] = useState<Meal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewIngModalOpen, setIsNewIngModalOpen] = useState(false);
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const initialForm: Meal = {
    name: '', category: 'Lunch', paxSize: 50, allergens: '',
    ingredients: [{ inventoryId: null, qty: 0, unit: '' }]
  };

  const [formData, setFormData] = useState<Meal>(initialForm);

  const [newInvItem, setNewInvItem] = useState({ 
    item: '', category: 'Meat', unit: 'kg', threshold: 10, current_qty: 0, price: 0 
  });

  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  // --- FETCH DATA ---
  const fetchInventory = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory');
      setInventory(Array.isArray(res.data) ? res.data : []);
    } catch (err) { 
      console.error("Inventory fetch failed", err); 
      setInventory([]);
    }
  };

  const fetchMeals = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/recipes');
      const data = Array.isArray(res.data) ? res.data : [];
      setMeals(data);
    } catch (err) {
      console.error("Recipes fetch failed", err);
      setMeals([]);
    }
  };

  useEffect(() => { 
    fetchInventory(); 
    fetchMeals();
  }, []);

  // --- SEARCH & FILTER LOGIC ---
  useEffect(() => {
    let result = [...meals];

    if (categoryFilter !== "All") {
      result = result.filter(m => m.category === categoryFilter);
    }
    if (searchQuery) {
      result = result.filter(m => 
        m.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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
    
    if (formData.ingredients.some(ing => !ing.inventoryId)) {
      alert("Please select an item for all ingredients or remove empty rows.");
      return;
    }

    try {
      const url = formData.id 
        ? `http://localhost:8080/api/recipes/${formData.id}` 
        : 'http://localhost:8080/api/recipes';
      
      if (formData.id) {
        await axios.put(url, formData);
      } else {
        await axios.post(url, formData);
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
      await axios.delete(`http://localhost:8080/api/recipes/${id}`);
      fetchMeals();
      setViewingMeal(null);
    } catch (err) {
      alert("Error deleting recipe.");
    }
  };

  const handleSaveNewIngredient = async () => {
    if (!newInvItem.item) return;
    try {
      await axios.post('http://localhost:8080/api/inventory', newInvItem);
      await fetchInventory(); 
      setIsNewIngModalOpen(false);
      setNewInvItem({ item: '', category: 'Meat', unit: 'kg', threshold: 10, current_qty: 0, price: 0 });
    } catch (err) {
      alert("Failed to add new ingredient to inventory.");
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "cook"]}>
      <div className="min-h-screen bg-[#F3F4F6] p-8 text-slate-800">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic">Meal Directory</h1>
              <p className="text-slate-500 font-bold">Standardized Recipes & Scaling</p>
            </div>
            {canEdit && (
              <button 
                onClick={() => {
                  setFormData(initialForm);
                  setIsModalOpen(true);
                }} 
                className="bg-[#76ba53] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:translate-y-1 hover:shadow-none transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Add Meal
              </button>
            )}
          </header>

          {/* Search/Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full border-2 border-black p-4 pl-12 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 ring-[#76ba53]"
                placeholder="Search by meal name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="border-2 border-black p-4 rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white cursor-pointer"
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
          <div className="bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-8">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-[#FFF9C4] border-b-2 border-black text-[10px] uppercase font-black">
                    <tr>
                    <th className="p-4 border-r-2 border-black text-center w-20">Meal #</th>
                    <th className="p-4 border-r-2 border-black">Meal Name</th>
                    <th className="p-4 border-r-2 border-black text-center">Category</th>
                    <th className="p-4 border-r-2 border-black text-center">Serving Size</th>
                    <th className="p-4 border-r-2 border-black text-center">Ingredients</th>
                    <th className="p-4">Allergens</th>
                    </tr>
                </thead>
                <tbody className="font-bold text-sm uppercase">
                    {currentItems.length > 0 ? (
                    currentItems.map((meal, index) => (
                        <tr 
                        key={meal.id || index} 
                        onClick={() => setViewingMeal(meal)}
                        className="border-b-2 border-black hover:bg-[#fdfae5] cursor-pointer transition-colors"
                        >
                        <td className="p-4 border-r-2 border-black text-center text-slate-400 italic">
                            {indexOfFirstItem + index + 1}
                        </td>
                        <td className="p-4 border-r-2 border-black font-black">{meal.name}</td>
                        <td className="p-4 border-r-2 border-black text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] border border-black/10 ${
                            meal.category === 'Breakfast' ? 'bg-orange-100' : 
                            meal.category === 'Lunch' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                            {meal.category}
                            </span>
                        </td>
                        <td className="p-4 border-r-2 border-black text-center">{meal.paxSize} PAX</td>
                        <td className="p-4 border-r-2 border-black text-center">{meal.ingredients?.length || 0}</td>
                        <td className="p-4 text-red-600 text-[11px] font-bold truncate max-w-[200px]">{meal.allergens || 'None'}</td>
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan={6} className="p-20 text-center bg-white">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                            <Search size={40} />
                            <p className="font-black italic uppercase">No Recipes Found</p>
                        </div>
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-between items-center">
            <p className="text-[10px] font-black uppercase text-slate-400">
              Showing {currentItems.length} of {filteredMeals.length} Results
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center bg-white hover:bg-slate-50 disabled:opacity-30 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>
              <div className="flex gap-1 items-center px-4 font-black text-sm uppercase italic">
                {currentPage} / {totalPages || 1}
              </div>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center bg-white hover:bg-slate-50 disabled:opacity-30 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all"
              >
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Add/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-[40px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="p-6 border-b-4 border-black bg-[#FFF9C4] flex justify-between items-center">
                  <h2 className="text-xl font-black italic uppercase">{formData.id ? 'Edit' : 'Add New'} Meal Recipe</h2>
                  <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSaveMeal} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="col-span-2">
                      <Label className="font-black uppercase text-[10px]">Meal Name</Label>
                      <input required className="w-full border-2 border-black p-3 rounded-xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <Label className="font-black uppercase text-[10px]">Category</Label>
                      <select className="w-full border-2 border-black p-3 rounded-xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
                      </select>
                    </div>
                    <div>
                      <Label className="font-black uppercase text-[10px]">Serving Size (Pax)</Label>
                      <input type="number" className="w-full border-2 border-black p-3 rounded-xl font-bold" value={formData.paxSize} onChange={e => setFormData({...formData, paxSize: parseInt(e.target.value)})} />
                    </div>
                    <div className="col-span-2">
                      <Label className="font-black uppercase text-[10px]">Allergens</Label>
                      <input className="w-full border-2 border-black p-3 rounded-xl font-bold" placeholder="e.g. Soy, Nuts" value={formData.allergens} onChange={e => setFormData({...formData, allergens: e.target.value})} />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black uppercase italic underline">Ingredients</h3>
                      <button type="button" onClick={() => setFormData({...formData, ingredients: [...formData.ingredients, {inventoryId: null, qty: 0, unit: ''}]})} className="text-green-600 font-black flex items-center gap-1 text-xs">
                        <PlusCircle size={16} /> Add Row
                      </button>
                    </div>
                    
                    {formData.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-3 mb-3 items-end">
                        <div className="flex-1">
                          <select required className="w-full border-2 border-black p-2 rounded-lg font-bold text-xs" value={ing.inventoryId || ""} onChange={(e) => handleIngredientSelect(idx, e.target.value)}>
                            <option value="">Select Item</option>
                            {inventory.map(item => <option key={item.id} value={item.id}>{item.item}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <input type="number" step="any" required className="w-full border-2 border-black p-2 rounded-lg font-bold text-xs" placeholder="Qty" value={ing.qty} onChange={e => {
                            const updated = [...formData.ingredients];
                            updated[idx].qty = parseFloat(e.target.value) || 0;
                            setFormData({...formData, ingredients: updated});
                          }} />
                        </div>
                        <div className="w-12 text-[10px] font-black uppercase text-slate-400 pb-3">{ing.unit || '-'}</div>
                        <button type="button" onClick={() => setFormData({...formData, ingredients: formData.ingredients.filter((_, i) => i !== idx)})} className="pb-2 text-red-500 hover:scale-110 transition-transform"><Trash size={18}/></button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => setIsNewIngModalOpen(true)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 hover:bg-blue-700 active:shadow-none active:translate-y-1 transition-all">
                    + Add New Ingredient (Not in Inventory)
                  </button>

                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border-2 border-black p-4 rounded-2xl font-black uppercase text-xs">Cancel</button>
                    <button type="submit" className="flex-1 bg-[#76ba53] border-2 border-black p-4 rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#68a449] active:shadow-none">Save Recipe</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* New Ingredient Quick-Add */}
          {isNewIngModalOpen && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black italic uppercase text-center mb-6">Add New Ingredient</h3>
                <div className="space-y-4 font-bold text-xs">
                  <div>
                    <Label>Item Name</Label>
                    <input className="w-full border-2 border-black p-2 rounded-lg" value={newInvItem.item} onChange={e => setNewInvItem({...newInvItem, item: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit</Label>
                      <select className="w-full border-2 border-black p-2 rounded-lg" value={newInvItem.unit} onChange={e => setNewInvItem({...newInvItem, unit: e.target.value})}>
                        <option>kg</option><option>g</option><option>pcs</option><option>L</option><option>mL</option>
                      </select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select className="w-full border-2 border-black p-2 rounded-lg" value={newInvItem.category} onChange={e => setNewInvItem({...newInvItem, category: e.target.value})}>
                        <option>Meat</option><option>Vegetables</option><option>Condiments</option><option>Dry Goods</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsNewIngModalOpen(false)} className="flex-1 border-2 border-black py-3 rounded-xl">Cancel</button>
                    <button onClick={handleSaveNewIngredient} className="flex-1 bg-green-600 text-white py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Add to Inventory</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <MealDetails 
            isOpen={!!viewingMeal}
            onClose={() => setViewingMeal(null)}
            recipe={viewingMeal}
            onEdit={(meal) => { 
                setViewingMeal(null); 
                setFormData(meal); 
                setIsModalOpen(true); 
            }}
            onDelete={handleDeleteMeal}
          />
        </div>
      </div>
    </RoleGuard>
  );
}