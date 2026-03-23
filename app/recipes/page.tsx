'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Save, ChevronDown, Utensils, 
  Loader2, Search, X, Info, ChevronRight 
} from 'lucide-react';
import { ApiClient } from "@/lib/api";

interface Ingredient {
  inventoryId: string;
  qty: number;
}

interface Recipe {
  id: number;
  name: string;
  category: string;
  allergens: string;
  paxSize: number;
  ingredients: Ingredient[];
}

export default function MealDirectory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Selection
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // New Recipe Form State
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: 'Lunch',
    allergens: '',
    paxSize: 50,
    ingredients: [{ inventoryId: '', qty: 0 }]
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, recRes] = await Promise.all([
        ApiClient.get("/api/inventory"),
        ApiClient.get("/api/recipes")
      ]);
      const invResult = await invRes.json();
      const recResult = await recRes.json();

      if (invResult?.success) setInventory(invResult.data || []);
      if (recResult?.success) setRecipes(recResult.data || []);
    } catch (error) {
      console.error("Data Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- ACTIONS ---

  const handleSaveRecipe = async () => {
    if (!newRecipe.name || newRecipe.ingredients.some(ing => !ing.inventoryId)) {
      alert("Missing Information: Please name the recipe and select ingredients.");
      return;
    }

    try {
      const res = await ApiClient.post('/api/recipes', newRecipe);
      if (res.ok) {
        setNewRecipe({ name: '', category: 'Lunch', allergens: '', paxSize: 50, ingredients: [{ inventoryId: '', qty: 0 }] });
        fetchData();
        alert("Recipe Template Created!");
      }
    } catch (error) {
      console.error("Save Error:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recipe template?")) return;
    await ApiClient.delete(`/api/recipes/${id}`);
    fetchData();
  };

  const handleServe = async (recipe: Recipe) => {
    const inputPax = prompt(`How many pax for ${recipe.name}?`, String(recipe.paxSize));
    if (!inputPax) return;

    const actualPax = Number(inputPax);
    const multiplier = actualPax / recipe.paxSize;

    try {
      for (const ing of recipe.ingredients) {
        const item = inventory.find(i => String(i.id) === String(ing.inventoryId));
        if (!item) continue;
        const deduction = ing.qty * multiplier;
        const newQty = Math.max(0, Number(item.qty) - deduction);

        await ApiClient.put(`/api/inventory/${item.id}`, { ...item, qty: String(newQty) });
      }
      alert("Inventory scaling complete. Stock deducted!");
      fetchData();
    } catch (err) {
      alert("Deduction failed. Check console.");
    }
  };

  const getInvName = (id: string) => inventory.find(i => String(i.id) === String(id))?.item || "Unknown Item";

  // --- FILTERING ---
  const filteredRecipes = (recipes || []).filter(r => {
    const matchesTab = activeTab === 'All' || r.category === activeTab;
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#76ba53] mx-auto mb-4" size={48} />
        <p className="font-black uppercase tracking-widest text-slate-400">Syncing Recipes...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-12">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-800">Meal Directory</h1>
          <p className="text-slate-500 font-bold">Manage Standardized Recipes & Scale Operations</p>
        </header>

        {/* CREATE SECTION */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100 mb-12">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#76ba53] mb-8 flex items-center gap-2">
            <Plus size={16} strokeWidth={3}/> Build New Template
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Recipe Name</label>
              <input 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-[#76ba53] focus:bg-white rounded-2xl p-4 font-bold transition-all outline-none"
                placeholder="e.g., Beef Caldereta"
                value={newRecipe.name}
                onChange={e => setNewRecipe({...newRecipe, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Category</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-[#76ba53] focus:bg-white rounded-2xl p-4 font-bold outline-none"
                value={newRecipe.category}
                onChange={e => setNewRecipe({...newRecipe, category: e.target.value})}
              >
                <option>Breakfast</option><option>Lunch</option><option>Snacks</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Std Pax</label>
              <input 
                type="number"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-[#76ba53] focus:bg-white rounded-2xl p-4 font-bold outline-none"
                value={newRecipe.paxSize}
                onChange={e => setNewRecipe({...newRecipe, paxSize: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400">Ingredients & Base Qty</h3>
              <button 
                onClick={() => setNewRecipe({...newRecipe, ingredients: [...newRecipe.ingredients, { inventoryId: '', qty: 0 }]})}
                className="text-[#76ba53] text-[10px] font-black uppercase hover:underline"
              >+ Add Line Item</button>
            </div>
            
            {newRecipe.ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-4 items-center animate-in fade-in slide-in-from-left-2">
                <select 
                  className="flex-1 bg-slate-50 border-2 border-transparent focus:border-[#76ba53] rounded-xl p-3 font-bold text-sm outline-none"
                  value={ing.inventoryId}
                  onChange={e => {
                    const updated = [...newRecipe.ingredients];
                    updated[idx].inventoryId = e.target.value;
                    setNewRecipe({...newRecipe, ingredients: updated});
                  }}
                >
                  <option value="">Select from Stock...</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.item} ({i.unit})</option>)}
                </select>
                <input 
                  type="number"
                  placeholder="Qty"
                  className="w-24 bg-slate-50 border-2 border-transparent focus:border-[#76ba53] rounded-xl p-3 font-bold text-sm outline-none"
                  value={ing.qty || ''}
                  onChange={e => {
                    const updated = [...newRecipe.ingredients];
                    updated[idx].qty = Number(e.target.value);
                    setNewRecipe({...newRecipe, ingredients: updated});
                  }}
                />
                <button 
                  onClick={() => setNewRecipe({...newRecipe, ingredients: newRecipe.ingredients.filter((_, i) => i !== idx)})}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                ><Trash2 size={18}/></button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleSaveRecipe}
            className="w-full mt-10 bg-[#76ba53] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-100 hover:translate-y-[-2px] active:scale-95 transition-all"
          >Save Recipe to Directory</button>
        </section>

        {/* LIST SECTION */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            {['All', 'Breakfast', 'Lunch', 'Snacks'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#76ba53] text-white shadow-lg shadow-green-50' : 'text-slate-400'}`}
              >{tab}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              className="w-full bg-white border-2 border-transparent focus:border-[#76ba53]/20 rounded-2xl pl-12 pr-6 py-4 font-bold shadow-sm outline-none"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-[#76ba53]/20 shadow-sm hover:shadow-xl transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#76ba53]">
                  <Utensils size={24} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 flex-1 items-center gap-4">
                  <div>
                    <h4 className="font-black uppercase italic text-slate-800 truncate">{recipe.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.category}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] font-black text-slate-300 uppercase">Standard Pax</p>
                    <p className="font-bold text-slate-700">{recipe.paxSize}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] font-black text-slate-300 uppercase">Allergens</p>
                    <p className="text-xs font-bold text-red-400 italic">{recipe.allergens || 'None'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedRecipe(recipe)}
                  className="p-4 text-slate-300 hover:text-blue-500 transition-colors"
                ><Info size={20}/></button>
                <button 
                  onClick={() => handleServe(recipe)}
                  className="bg-[#76ba53] text-white p-4 rounded-2xl hover:scale-110 transition-all shadow-lg shadow-green-50"
                ><ChevronRight size={20} strokeWidth={3} /></button>
                <button 
                  onClick={() => handleDelete(recipe.id)}
                  className="p-4 text-slate-100 hover:text-red-400 transition-colors"
                ><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* DETAIL MODAL */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase italic">{selectedRecipe.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedRecipe.category} Template</p>
                </div>
                <button onClick={() => setSelectedRecipe(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Yield</p>
                    <p className="text-xl font-black">{selectedRecipe.paxSize} Pax</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-red-300 uppercase mb-1">Allergens</p>
                    <p className="text-sm font-bold text-red-500">{selectedRecipe.allergens || 'None Reported'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredient Breakdown</p>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 px-6 py-4 rounded-2xl">
                        <span className="font-bold text-slate-700">{getInvName(ing.inventoryId)}</span>
                        <span className="font-black text-[#76ba53]">{ing.qty} unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-10 bg-slate-50">
                <button 
                  onClick={() => { handleServe(selectedRecipe); setSelectedRecipe(null); }}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest"
                >Deduct from Stock</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}