"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Bell, X, ArrowLeft, Edit, Trash, Loader2, Utensils } from 'lucide-react';

interface Meal {
  id: number | null;
  name: string;
  category: string;
  size: number | string;
  allergens: string;
}

const MealDirectory = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Meal>({ id: null, name: '', category: '', size: '', allergens: '' });
  
  const API_BASE = "http://localhost:8080/api/meals";

  // Initial Data Fetch
  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE);
      const result = await response.json();
      
      if (result.success && result.data) {
        // MAPPING: Aligning Backend JSON keys to Frontend State
        const mappedMeals = result.data.map((m: any) => ({
          id: m.id,
          name: m.meal_name || "Untitled Meal",
          category: m.category || "Uncategorized",
          size: m.serving_size ?? 0,
          allergens: m.allergens || "None"
        }));
        setMeals(mappedMeals);
      }
    } catch (err) {
      console.error("Failed to load meals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!formData.name.trim() || !formData.category) {
      alert("Meal name and category are required!");
      return;
    }

    setIsSaving(true);
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_BASE}/${formData.id}` : API_BASE;

    // PAYLOAD: Sending the exact keys the Go Struct expects
    const payload = {
      meal_name: formData.name,
      category: formData.category,
      serving_size: Number(formData.size) || 0,
      allergens: formData.allergens
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsModalOpen(false);
        await fetchMeals(); 
        
        // If editing, update the detail view with new data
        if (isEditing) {
            setSelectedMeal({
                ...formData,
                size: Number(formData.size) || 0
            });
        } else {
            setSelectedMeal(null);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (err) {
      alert("Server connection failed. Is the backend running?");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ id: null, name: '', category: '', size: '', allergens: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (selectedMeal) {
      setFormData({ 
        ...selectedMeal, 
        size: selectedMeal.size.toString() 
      });
      setIsEditing(true);
      setIsModalOpen(true);
    }
  };

  const handleDeleteMeal = async (id: number | null) => {
    if (!id || !window.confirm("Are you sure you want to delete this meal?")) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (response.ok) {
        setSelectedMeal(null);
        fetchMeals();
      }
    } catch (err) { 
      console.error("Delete failed:", err); 
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] p-8 font-sans text-gray-700 relative">
      {/* Top Header Navigation */}
      <div className="flex justify-end items-start mb-6 max-w-6xl mx-auto">
        <div className="relative cursor-pointer hover:scale-110 transition-transform">
          <Bell className="w-8 h-8 text-gray-400" />
          <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
        </div>
      </div>

      {selectedMeal ? (
        /* --- SINGLE MEAL DETAIL VIEW --- */
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-6">
              <button onClick={() => setSelectedMeal(null)} className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors shadow-lg">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{selectedMeal.name}</h1>
                <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">{selectedMeal.category} • Serving: {selectedMeal.size}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={openEditModal} className="flex items-center gap-2 bg-[#79C34B] hover:bg-[#68a840] text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm">
                <Edit size={18} /> Edit
              </button>
              <button onClick={() => handleDeleteMeal(selectedMeal.id)} className="flex items-center gap-2 bg-[#A63A2F] hover:bg-[#8a2f26] text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm">
                <Trash size={18} /> Delete
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl">
              <h2 className="text-sm font-black mb-8 text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Meal Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Category</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedMeal.category}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Serving Size</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedMeal.size} pax</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Allergens</p>
                  <p className="text-lg font-semibold text-[#A63A2F]">{selectedMeal.allergens || 'None Reported'}</p>
                </div>
              </div>
          </div>
        </div>
      ) : (
        /* --- MAIN DIRECTORY LIST VIEW --- */
        <div className={`max-w-6xl mx-auto transition-all duration-300 ${isModalOpen ? 'blur-md grayscale-[50%] pointer-events-none' : ''}`}>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Meal Directory</h1>
              <p className="text-gray-500 mt-2 text-lg font-medium">Manage recipes and nutritional standards</p>
            </div>
            <button onClick={openAddModal} className="flex items-center gap-2 bg-[#79C34B] hover:bg-[#68a840] text-white px-8 py-4 rounded-full font-bold shadow-lg transition-transform active:scale-95">
              <Plus size={22} /> Add New Meal
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F5E7] text-gray-600 text-xs font-black uppercase tracking-widest">
                  <th className="py-5 px-6 border-r border-gray-200 w-20">ID</th>
                  <th className="py-5 px-6 border-r border-gray-200">Meal Name</th>
                  <th className="py-5 px-6 border-r border-gray-200">Category</th>
                  <th className="py-5 px-6 border-r border-gray-200 text-center">Size</th>
                  <th className="py-5 px-6">Allergens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-gray-400" size={40} />
                      <p className="text-gray-400 mt-2 font-medium">Fetching Directory...</p>
                    </td>
                  </tr>
                ) : meals.length > 0 ? (
                  meals.map((meal) => (
                    <tr key={meal.id} onClick={() => setSelectedMeal(meal)} className="hover:bg-orange-50/50 cursor-pointer transition-colors group">
                      <td className="py-5 px-6 border-r border-gray-100 text-gray-400 font-mono">#{meal.id}</td>
                      <td className="py-5 px-6 border-r border-gray-100 font-bold text-gray-900 group-hover:text-[#79C34B]">{meal.name}</td>
                      <td className="py-5 px-6 border-r border-gray-100 italic text-gray-500 font-medium">{meal.category}</td>
                      <td className="py-5 px-6 border-r border-gray-100 font-bold text-center text-[#79C34B]">{meal.size}</td>
                      <td className="py-5 px-6 text-sm text-red-700/70 font-semibold">{meal.allergens}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-gray-400">
                      <Utensils className="mx-auto mb-4 opacity-10" size={64} />
                      <p className="text-lg font-bold">The kitchen is currently empty.</p>
                      <p className="text-sm">Click "Add New Meal" to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT MEAL MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 border border-gray-100">
               <div className="flex justify-between items-center border-b pb-4">
                 <h2 className="text-2xl font-black text-gray-900">{isEditing ? 'Update Entry' : 'New Meal Entry'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X size={20} />
                 </button>
               </div>
               
               <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Designation</label>
                    <input 
                      placeholder="e.g. Herb-Crusted Salmon" 
                      className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-[#79C34B] outline-none transition-all font-semibold" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classification</label>
                      <select 
                        className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-[#79C34B] outline-none transition-all appearance-none bg-white font-semibold" 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="">Select...</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Snack">Snack</option>
                        <option value="Dinner">Dinner</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Volume (Pax)</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-[#79C34B] outline-none transition-all font-semibold" 
                        value={formData.size} 
                        onChange={(e) => setFormData({...formData, size: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Allergen Warnings</label>
                    <textarea 
                      placeholder="List any allergens (e.g. Nuts, Dairy)..." 
                      className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-[#79C34B] outline-none transition-all h-28 resize-none font-medium" 
                      value={formData.allergens} 
                      onChange={(e) => setFormData({...formData, allergens: e.target.value})} 
                    />
                  </div>
               </div>

               <div className="flex justify-end gap-3 pt-4">
                 <button 
                   onClick={() => setIsModalOpen(false)} 
                   className="px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-bold transition-colors"
                 >
                   Discard Changes
                 </button>
                 <button 
                   disabled={isSaving} 
                   onClick={handleSaveMeal} 
                   className="px-10 py-4 bg-[#79C34B] hover:bg-[#68a840] text-white rounded-xl font-black flex items-center gap-2 shadow-xl shadow-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isSaving && <Loader2 className="animate-spin" size={20} />}
                   {isEditing ? 'Confirm Update' : 'Publish Meal'}
                 </button>
               </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealDirectory;