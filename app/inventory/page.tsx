'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from "@/context/AuthContext";
import { ApiClient } from "@/lib/api";
import { 
  Search, Plus, AlertTriangle, Trash2, MoreVertical 
} from 'lucide-react';

interface Ingredient {
  id: number;
  item: string;
  category: string;
  threshold: number;
  unit: string;
  qty: number;
  price: number;
}

type FormData = {
  id: number | null;
  item: string;
  category: string;
  threshold: number;
  unit: string;
  qty: number;
  price: number;
};

const CATEGORY_OPTIONS = [
  "Vegetable",
  "Meat",
  "Dairy",
  "Frozen",
  "Canned",
  "Baked",
  "Snacks",
  "Beverages",
  "Other",
];

export default function InventoryPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStock, setFilterStock] = useState("All Stock Levels");

  const isStaff = user?.role?.toLowerCase() === "staff";
  const canEdit = ["admin", "cook"].includes(user?.role?.toLowerCase() || "");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    id: null,
    item: '',
    category: CATEGORY_OPTIONS[0],
    threshold: 0,
    unit: 'pcs',
    qty: 0,
    price: 0 
  });

  // ✅ FIXED FETCH (MAIN FIX)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get("/api/inventory");
      if (res.ok) {
        const result = await res.json();
        const data = result?.data && Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
        setIngredients(data);
      } else {
        setIngredients([]);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setIngredients([]); // prevent crash
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  // ✅ SAFE FILTERING
  useEffect(() => {
    let result = Array.isArray(ingredients) ? ingredients : [];

    if (filterCategory !== "All Categories") {
      result = result.filter(ing => ing.category === filterCategory);
    }

    if (filterStock !== "All Stock Levels") {
      result = result.filter(ing => {
        const status = getStatusLabel(ing?.qty || 0, ing?.threshold || 0);
        return status.toLowerCase() === filterStock.toLowerCase();
      });
    }

    if (searchTerm) {
      result = result.filter(ing => 
        ing.item?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredIngredients(result);
  }, [searchTerm, filterCategory, filterStock, ingredients]);

  // ✅ FIXED LOW STOCK COUNT (NO CRASH)
  const lowStockCount = useMemo(() => {
    if (!Array.isArray(ingredients)) return 0;
    return ingredients.filter(ing => 
      Number(ing?.qty || 0) <= Number(ing?.threshold || 0)
    ).length;
  }, [ingredients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!formData.id;

    const url = isEditing 
      ? `/api/inventory/${formData.id}` 
      : "/api/inventory";

    const ingredientData = {
      item: formData.item,
      category: formData.category,
      qty: Number(formData.qty),
      threshold: Number(formData.threshold),
      unit: formData.unit,
      price: Number(formData.price)
    };

    try {
      const response = isEditing
        ? await ApiClient.put(url, ingredientData)
        : await ApiClient.post(url, ingredientData);

      const result = await response.json();

      if (response.ok) {
        await fetchData();
        setIsModalOpen(false);
      } else {
        alert("Error: " + (result.message || "Failed to save"));
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      const message = error?.message || "Connection Error";
      alert(`Failed to save ingredient. ${message}\n\nEnsure the backend is running and that NEXT_PUBLIC_API_URL is correct.`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await ApiClient.delete(`/api/inventory/${id}`);
      if (res.ok) {
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

  if (loading) return <div className="p-8 text-center font-black animate-pulse">LOADING INVENTORY...</div>;

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Inventory</h1>
            <p className="text-slate-500 font-medium italic">StockMate Management</p>
          </div>
          
          <div className="flex items-center gap-6">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 font-bold text-xs uppercase">
                <AlertTriangle size={16} /> {lowStockCount} Items Low
              </div>
            )}
            {canEdit && (
              <button 
                onClick={() => { 
                  setFormData({id:null, item:'', category:'', threshold:0, unit:'pcs', qty:0, price:0}); 
                  setIsModalOpen(true); 
                }}
                className="bg-[#76ba53] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:scale-95 flex items-center gap-2"
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
              placeholder="Search by ingredient name..." 
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
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select 
            className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white font-bold outline-none"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option>All Stock Levels</option>
            <option>IN STOCK</option>
            <option>LOW STOCK</option>
            <option>NO STOCK</option>
          </select>
        </div>

        {/* TABLE (UNCHANGED UI) */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-[#fff9c4] border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
              <tr>
                <th className="p-5">Item Name</th>
                <th className="p-5 text-center">Category</th>
                <th className="p-5 text-center">Qty</th>
                <th className="p-5 text-center">Price</th>
                <th className="p-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold uppercase">
              {filteredIngredients.length > 0 ? (
                filteredIngredients.map((ing) => (
                  <tr
                    key={ing.id}
                    className={`border-b border-slate-50 transition-colors ${canEdit ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                    onClick={() => {
                      if (!canEdit) return;
                      setFormData(ing);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="p-5 text-slate-800">{ing.item}</td>
                    <td className="p-5 text-center text-slate-500">{ing.category}</td>
                    <td className="p-5 text-center">
                      <span className={ing.qty <= ing.threshold ? "text-red-500 font-black" : "text-slate-700"}>
                        {ing.qty} {ing.unit}
                      </span>
                    </td>
                    <td className="p-5 text-center">₱{ing.price}</td>
                    <td className="p-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${getStatusStyle(ing.qty, ing.threshold)}`}>
                        {getStatusLabel(ing.qty, ing.threshold)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-bold italic">
                    No ingredients found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (UNCHANGED) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-8 uppercase italic">{formData.id ? "Update" : "Add New"} Ingredient</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Ingredient Name</label>
                  <input
                    placeholder="Enter ingredient name"
                    className="w-full border p-3 rounded-xl"
                    value={formData.item}
                    onChange={e => setFormData({ ...formData, item: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Category</label>
                  <select
                    className="w-full border p-3 rounded-xl"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Unit</label>
                  <select
                    className="w-full border p-3 rounded-xl"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {['pcs', 'kg', 'g', 'liters', 'packs', 'bunch'].map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Current Quantity</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border p-3 rounded-xl"
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Threshold</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border p-3 rounded-xl"
                    value={formData.threshold}
                    onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase mb-1">Price (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full border p-3 rounded-xl"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl border-2 border-slate-300 font-black uppercase"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  {formData.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.id) handleDelete(formData.id);
                      }}
                      className="px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase"
                    >
                      Delete
                    </button>
                  )}
                  <button type="submit" className="px-6 py-3 rounded-xl bg-green-600 text-white font-black uppercase">
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}