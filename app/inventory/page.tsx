'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from "@/context/AuthContext";
import { 
  Search, Plus, ChevronLeft, ChevronRight, 
  Bell, Filter, MoreVertical, AlertTriangle, X 
} from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStock, setFilterStock] = useState("All Stock Levels");

  // Role check permissions
  const isStaff = user?.role?.toLowerCase() === "staff";
  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  // --- MODAL & FORM STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    item: '',
    category: '',
    threshold: '',
    unit: 'pcs',
    qty: '',
    price: '' 
  });

  // --- FETCH DATA FROM GO BACKEND ---
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

  // --- SEARCH & FILTER LOGIC ---
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

  // --- STOCK ALERT CALCULATIONS ---
  const lowStockCount = useMemo(() => 
    ingredients.filter(ing => ing.status?.toLowerCase() === 'low stock' || ing.status?.toLowerCase() === 'no stock').length
  , [ingredients]);

  // --- HANDLE FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!formData.id;
    const url = isEditing 
      ? `http://localhost:8080/api/inventory/${formData.id}` 
      : 'http://localhost:8080/api/inventory';

    const cleanPrice = String(formData.price).replace(/[P\s]/g, '');

    const ingredientData = {
      item: formData.item,
      category: formData.category,
      qty: String(formData.qty), 
      threshold: String(formData.threshold), 
      unit: formData.unit,
      price: cleanPrice, 
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredientData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(isEditing ? "Updated successfully!" : "Saved to Database!");
        await fetchData(); 
        setIsModalOpen(false); 
      } else {
        alert("Server Error: " + (result.message || "Could not save data"));
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("Connection Error: Is your Go server running on port 8080?");
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'in stock': 
      case 'available': return 'bg-green-100 text-green-700 border-green-200';
      case 'low stock': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'no stock': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse uppercase tracking-widest">Loading Inventory...</div>;

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-[#F3F4F6] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Inventory</h1>
            <p className="text-slate-500 font-medium">Manage and track ingredient stock levels</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
                <Bell size={28} className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>
            </div>
            {canEdit && (
              <button 
                onClick={() => { 
                  setFormData({id:null, item:'', category:'', threshold:'', unit:'pcs', qty:'', price:''}); 
                  setIsModalOpen(true); 
                }}
                className="flex items-center gap-2 bg-[#76ba53] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
              >
                <Plus size={20} strokeWidth={3} /> Add Ingredient
              </button>
            )}
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search ingredients..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#76ba53] outline-none transition-colors font-bold text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white font-bold text-slate-600 outline-none focus:border-[#76ba53]"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option>All Categories</option>
            {["Vegetable", "Meat", "Fish", "Dairy", "Frozen", "Baked", "Canned"].map(cat => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <select 
            className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white font-bold text-slate-600 outline-none focus:border-[#76ba53]"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option>All Stock Levels</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>No Stock</option>
          </select>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-[#fff9c4] border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
              <tr>
                <th className="p-5 text-center">Item #</th>
                <th className="p-5">Item Name</th>
                <th className="p-5 text-center">Category</th>
                <th className="p-5 text-center">Current Qty</th>
                <th className="p-5 text-center">Avg Price</th>
                <th className="p-5 text-center">Status</th>
                {!isStaff && <th className="p-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-sm font-bold uppercase">
              {filteredIngredients.map((ing, idx) => (
                <tr key={ing.id || idx} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                  <td className="p-5 text-slate-400 text-center font-medium">#{idx + 1}</td>
                  <td className="p-5 text-slate-800">{ing.item}</td>
                  <td className="p-5 text-center text-slate-500 font-medium">{ing.category}</td>
                  <td className="p-5 text-center">
                    <span className={ing.qty <= ing.threshold ? "text-red-500" : "text-slate-800"}>
                      {ing.qty} {ing.unit}
                    </span>
                  </td>
                  <td className="p-5 text-center text-slate-800 font-black">
                    P{ing.price || 0}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${getStatusStyle(ing.status)}`}>
                      {ing.status || 'IN STOCK'}
                    </span>
                  </td>
                  {!isStaff && (
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => {
                          setFormData({...ing, price: String(ing.price)});
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredIngredients.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No Ingredients Found</div>
          )}
        </div>

        {/* PAGINATION & ALERTS */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] flex items-start gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-lg shadow-orange-200">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-orange-800 uppercase text-sm">Stock Alert</h3>
              <p className="text-orange-600 text-xs font-bold mt-1">
                {lowStockCount > 0 
                  ? `${lowStockCount} items are low on stock or empty. Consider restocking.` 
                  : "All stock levels are currently healthy."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 self-center">
            <button className="p-3 border-2 border-slate-200 rounded-xl text-slate-400 hover:bg-white transition-colors"><ChevronLeft size={20} /></button>
            <button className="px-6 py-3 bg-[#76ba53] text-white rounded-xl font-black text-sm">1</button>
            <button className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-sm text-slate-600">2</button>
            <button className="p-3 border-2 border-slate-200 rounded-xl text-slate-400 hover:bg-white transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl relative border-t-8 border-[#76ba53]">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-8 top-8 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
              {formData.id ? "Edit Ingredient" : "Add New Ingredient"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Name</label>
                <input 
                  required 
                  className="col-span-2 border-2 border-slate-100 rounded-xl px-5 py-3 outline-none focus:border-[#76ba53] font-bold text-sm bg-slate-50" 
                  value={formData.item} 
                  onChange={e => setFormData({...formData, item: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Category</label>
                <select 
                  required 
                  className="col-span-2 border-2 border-slate-100 rounded-xl px-5 py-3 bg-slate-50 font-bold text-sm outline-none focus:border-[#76ba53]" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="" disabled>Select Category</option>
                  {["Vegetable", "Meat", "Fish", "Dairy", "Frozen", "Canned", "Baked"].map(cat => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Qty</label>
                  <input required type="number" className="w-full border-2 border-slate-100 rounded-xl px-5 py-3 font-bold text-sm bg-slate-50" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Unit</label>
                  <select className="w-full border-2 border-slate-100 rounded-xl px-5 py-3 font-bold text-sm bg-slate-50" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    <option>pcs</option><option>kg</option><option>packs</option><option>grams</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Threshold</label>
                  <input required type="number" className="w-full border-2 border-slate-100 rounded-xl px-5 py-3 font-bold text-sm bg-slate-50" value={formData.threshold} onChange={e => setFormData({...formData, threshold: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Price (PHP)</label>
                  <input required type="number" className="w-full border-2 border-slate-100 rounded-xl px-5 py-3 font-bold text-sm bg-slate-50" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#76ba53] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}