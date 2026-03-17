'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from "@/context/AuthContext";
import { 
  Search, Plus, ChevronLeft, ChevronRight, 
  Bell, Filter, MoreVertical, AlertTriangle, X, Trash2 
} from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStock, setFilterStock] = useState("All Stock Levels");

  const isStaff = user?.role?.toLowerCase() === "staff";
  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    item: '',
    category: '',
    threshold: 0,
    unit: 'pcs',
    qty: 0,
    price: 0 
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/api/inventory');
      const result = await res.json();
      if (result && result.success && Array.isArray(result.data)) {
        setIngredients(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    let result = ingredients;
    if (filterCategory !== "All Categories") {
      result = result.filter(ing => ing.category === filterCategory);
    }
    if (filterStock !== "All Stock Levels") {
      result = result.filter(ing => ing.status?.toLowerCase() === filterStock.toLowerCase());
    }
    if (searchTerm) {
      result = result.filter(ing => 
        ing.item.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredIngredients(result);
  }, [searchTerm, filterCategory, filterStock, ingredients]);

  const lowStockCount = useMemo(() => 
    ingredients.filter(ing => ing.qty <= ing.threshold).length
  , [ingredients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!formData.id;
    const url = isEditing 
      ? `http://localhost:8080/api/inventory/${formData.id}` 
      : 'http://localhost:8080/api/inventory';

    // Ensure numeric types for the Go backend (float64/int)
    const ingredientData = {
      item: formData.item,
      category: formData.category,
      qty: Number(formData.qty), 
      threshold: Number(formData.threshold), 
      unit: formData.unit,
      price: Number(formData.price), 
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredientData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchData(); 
        setIsModalOpen(false); 
      } else {
        alert("Error: " + (result.message || "Failed to save"));
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("Connection Error to Go Backend");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setIngredients(prev => prev.filter(ing => ing.id !== id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const getStatusStyle = (qty: number, threshold: number) => {
    if (qty <= 0) return 'bg-red-100 text-red-700 border-red-200';
    if (qty <= threshold) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getStatusLabel = (qty: number, threshold: number) => {
    if (qty <= 0) return 'NO STOCK';
    if (qty <= threshold) return 'LOW STOCK';
    return 'IN STOCK';
  };

  if (loading) return <div className="p-8 text-center animate-pulse">LOADING INVENTORY...</div>;

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Inventory</h1>
            <p className="text-slate-500 font-medium">StockMate Management</p>
          </div>
          
          <div className="flex items-center gap-6">
            {canEdit && (
              <button 
                onClick={() => { 
                  setFormData({id:null, item:'', category:'', threshold:0, unit:'pcs', qty:0, price:0}); 
                  setIsModalOpen(true); 
                }}
                className="bg-[#76ba53] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={20} /> Add Ingredient
              </button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#76ba53] outline-none font-bold bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white font-bold outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option>All Categories</option>
            {["Vegetable", "Meat", "Fish", "Dairy", "Frozen", "Baked", "Canned"].map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-[#fff9c4] border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
              <tr>
                <th className="p-5">Item Name</th>
                <th className="p-5 text-center">Category</th>
                <th className="p-5 text-center">Qty</th>
                <th className="p-5 text-center">Price</th>
                <th className="p-5 text-center">Status</th>
                {!isStaff && <th className="p-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-sm font-bold uppercase">
              {filteredIngredients.map((ing) => (
                <tr key={ing.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-5 text-slate-800">{ing.item}</td>
                  <td className="p-5 text-center text-slate-500">{ing.category}</td>
                  <td className="p-5 text-center">
                    <span className={ing.qty <= ing.threshold ? "text-red-500 font-black" : ""}>
                      {ing.qty} {ing.unit}
                    </span>
                  </td>
                  <td className="p-5 text-center">₱{ing.price}</td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${getStatusStyle(ing.qty, ing.threshold)}`}>
                      {getStatusLabel(ing.qty, ing.threshold)}
                    </span>
                  </td>
                  {!isStaff && (
                    <td className="p-5 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => { setFormData(ing); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600"
                      >
                        <MoreVertical size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ing.id)}
                        className="p-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl relative">
            <h2 className="text-2xl font-black mb-8 uppercase">{formData.id ? "Edit" : "New"} Ingredient</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                placeholder="Item Name" 
                className="w-full border-2 p-3 rounded-xl font-bold bg-slate-50" 
                value={formData.item} 
                onChange={e => setFormData({...formData, item: e.target.value})} 
                required
              />
              <select 
                className="w-full border-2 p-3 rounded-xl font-bold bg-slate-50"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Select Category</option>
                {["Vegetable", "Meat", "Fish", "Dairy", "Frozen", "Canned", "Baked"].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Qty" className="border-2 p-3 rounded-xl bg-slate-50" value={formData.qty} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} />
                <input type="number" placeholder="Price" className="border-2 p-3 rounded-xl bg-slate-50" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Threshold" className="border-2 p-3 rounded-xl bg-slate-50" value={formData.threshold} onChange={e => setFormData({...formData, threshold: Number(e.target.value)})} />
                <select className="border-2 p-3 rounded-xl bg-slate-50" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                  <option>pcs</option><option>kg</option><option>packs</option><option>grams</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-black text-slate-500 uppercase">Cancel</button>
                <button type="submit" className="flex-1 bg-[#76ba53] text-white py-3 rounded-xl font-black uppercase">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}