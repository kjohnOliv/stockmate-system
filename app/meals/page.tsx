"use client";

import React, { useState } from 'react';
import { Search, Plus, Bell, ChevronDown, X, Trash2, ArrowLeft, Edit, Trash } from 'lucide-react';

// 1. DEFINE THE INTERFACE
interface Meal {
  id: number | null;
  name: string;
  category: string;
  size: number | string;
  ingredients?: number;
  allergens: string;
}

const MealDirectory = () => {
  // --- STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 2. TELL USESTATE WHAT TYPE TO EXPECT
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [meals, setMeals] = useState<Meal[]>([
    { id: 1, name: "Menudo", category: "Lunch", size: 50, ingredients: 5, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 2, name: "Afritada", category: "Lunch", size: 50, ingredients: 8, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 3, name: "Giniling", category: "Lunch", size: 50, ingredients: 7, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 4, name: "Sopas", category: "Snack", size: 70, ingredients: 6, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 5, name: "Hotsilog", category: "Breakfast", size: 30, ingredients: 4, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 6, name: "Tapasilog", category: "Breakfast", size: 30, ingredients: 5, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 7, name: "Burger", category: "Snack", size: 50, ingredients: 4, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 8, name: "Egg Sandwich", category: "Snack", size: 50, ingredients: 5, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 9, name: "Kwek-Kwek", category: "Snack", size: 30, ingredients: 5, allergens: "soy, gluten, fish, diary, eggs, corn" },
    { id: 10, name: "Spaghetti", category: "Snack", size: 30, ingredients: 8, allergens: "soy, gluten, fish, diary, eggs, corn" },
  ]);

  const [formData, setFormData] = useState<Meal>({ id: null, name: '', category: '', size: '', allergens: '' });

  // --- HANDLERS ---
  const openAddModal = () => {
    setFormData({ id: null, name: '', category: '', size: '', allergens: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (selectedMeal) {
      setFormData({ ...selectedMeal });
      setIsEditing(true);
      setIsModalOpen(true);
    }
  };

  const handleSaveMeal = () => {
    if (!formData.name) return;

    if (isEditing) {
      const updatedMeals = meals.map(m => m.id === formData.id ? { ...formData, size: Number(formData.size) } : m);
      setMeals(updatedMeals);
      setSelectedMeal({ ...formData, size: Number(formData.size) }); 
    } else {
      const mealToAdd: Meal = {
        ...formData,
        id: meals.length + 1,
        size: Number(formData.size) || 0,
        ingredients: 3,
      };
      setMeals([...meals, mealToAdd]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteMeal = (id: number | null) => {
    if (id === null) return;
    setMeals(meals.filter(m => m.id !== id));
    setSelectedMeal(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-700 relative">
      <div className="flex justify-end items-start mb-6">
        <div className="relative">
          <Bell className="w-8 h-8 text-gray-600" />
          <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
        </div>
      </div>

      {selectedMeal ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-6">
              <button onClick={() => setSelectedMeal(null)} className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-transform active:scale-90">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedMeal.name}</h1>
                <p className="text-gray-500">{selectedMeal.category} • Serves {selectedMeal.size}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={openEditModal} className="flex items-center gap-2 bg-[#79C34B] text-white px-5 py-2 rounded-lg font-bold shadow-sm hover:bg-green-600">
                <Edit size={18} /> Edit
              </button>
              <button onClick={() => handleDeleteMeal(selectedMeal.id)} className="flex items-center gap-2 bg-[#A63A2F] text-white px-5 py-2 rounded-lg font-bold shadow-sm hover:bg-red-700">
                <Trash size={18} /> Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white border border-gray-300 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Meal Information</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Category</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedMeal.category}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Serving Size</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedMeal.size} pax</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Ingredients</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedMeal.ingredients || 5}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Allergens</p>
                  <p className="text-lg font-bold text-gray-800 leading-tight">{selectedMeal.allergens}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Ingredients</h2>
              <div className="space-y-3">
                {["Pork - 3kg", "Potato - 5 pcs", "Carrots - 4 pcs", "Hotdog - 0.5 kg", "Tomato Sauce - 1L"].map((ing, idx) => (
                  <div key={idx} className="flex justify-between items-center border border-gray-200 rounded-xl px-6 py-3 bg-gray-50 font-semibold">
                    <span>{ing.split(' - ')[0]}</span>
                    <span className="text-gray-500">{ing.split(' - ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 p-8 ${isModalOpen ? 'blur-sm pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meal Directory</h1>
              <p className="text-gray-500 mt-1">Manage your meal recipes</p>
            </div>
            <button onClick={openAddModal} className="flex items-center gap-2 bg-[#79C34B] hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-md transition-all active:scale-95">
              <Plus size={20} /> Add Meal
            </button>
          </div>
          
          <div className="overflow-x-auto border border-gray-300 rounded-sm">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-[#F9F5E7] border-b border-gray-300 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-4 border-r border-gray-300">Meal #</th>
                  <th className="py-4 px-4 border-r border-gray-300">Meal Name</th>
                  <th className="py-4 px-4 border-r border-gray-300">Category</th>
                  <th className="py-4 px-4 border-r border-gray-300">Serving Size</th>
                  <th className="py-4 px-4">Allergens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {meals.map((meal) => (
                  <tr key={meal.id} onClick={() => setSelectedMeal(meal)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                    <td className="py-4 px-4 border-r border-gray-300">{meal.id}</td>
                    <td className="py-4 px-4 border-r border-gray-300 font-bold text-gray-900">{meal.name}</td>
                    <td className="py-4 px-4 border-r border-gray-300">{meal.category}</td>
                    <td className="py-4 px-4 border-r border-gray-300">{meal.size}</td>
                    <td className="py-4 px-4 text-xs text-gray-500 italic">{meal.allergens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in duration-200">
            <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold">{isEditing ? 'Edit Meal' : 'Add Meal'}</h2>
                 <X className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
               </div>
               
               <div className="space-y-4">
                  <input 
                    placeholder="Meal Name"
                    className="w-full border p-2 rounded-lg"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <select 
                    className="w-full border p-2 rounded-lg"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <input 
                    type="number"
                    placeholder="Serving Size"
                    className="w-full border p-2 rounded-lg"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                  />
                  <textarea 
                    placeholder="Allergens"
                    className="w-full border p-2 rounded-lg"
                    value={formData.allergens}
                    onChange={(e) => setFormData({...formData, allergens: e.target.value})}
                  />
               </div>

               <div className="flex justify-end gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-200 rounded-lg">Cancel</button>
                 <button onClick={handleSaveMeal} className="px-6 py-2 bg-green-500 text-white rounded-lg">Save</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealDirectory;