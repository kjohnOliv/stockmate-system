'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Bell } from 'lucide-react';

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStock, setFilterStock] = useState("All Stock Levels");

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
      const res = await fetch('http://localhost:8080/api/inventory');
      const result = await res.json();
      if (result && result.success && Array.isArray(result.data)) {
        setIngredients(result.data);
        setFilteredIngredients(result.data);
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

  // --- HANDLE FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!formData.id;
    const url = isEditing 
      ? `http://localhost:8080/api/inventory/${formData.id}` 
      : 'http://localhost:8080/api/inventory';

    // Cleanup price: Remove "P" and spaces so backend receives a clean number string
    const cleanPrice = formData.price.replace(/[P\s]/g, '');

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
      case 'in stock': return 'bg-[#C1E1C1] text-[#1B4332] border-[#95D5B2]';
      case 'low stock': return 'bg-[#F9E2AF] text-[#926C15] border-[#E9C46A]';
      case 'no stock': return 'bg-[#F8ADAD] text-[#780000] border-[#E57373]';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Inventory...</div>;

  return (
    <div className="p-8 bg-[#F3F4F6] min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-[#111827] tracking-tight">Inventory</h1>
            <p className="text-slate-500 font-medium mt-1">Track and manage your ingredient stock</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
                <Bell size={28} className="text-slate-600 cursor-pointer" />
                <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>
            </div>
            <button 
              onClick={() => { 
                setFormData({id:null, item:'', category:'', threshold:'', unit:'pcs', qty:'', price:''}); 
                setIsModalOpen(true); 
              }}
              className="bg-[#7BC950] hover:bg-[#62BD4D] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95"
            >
              <Plus size={24} strokeWidth={3} /> Add Ingredient
            </button>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Ingredients..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 border-2 border-[#D1D5DB] rounded-2xl outline-none focus:border-[#7BC950] bg-white font-medium shadow-sm" 
            />
          </div>
          <select 
            className="border-2 border-[#D1D5DB] rounded-2xl px-6 py-4 bg-white font-bold text-slate-700 cursor-pointer outline-none focus:border-[#7BC950]" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option>All Categories</option>
            <option>Vegetable</option><option>Meat</option><option>Fish</option><option>Dairy</option><option>Frozen</option><option>Baked</option><option>Canned</option>
          </select>
          <select 
            className="border-2 border-[#D1D5DB] rounded-2xl px-6 py-4 bg-white font-bold text-slate-700 cursor-pointer outline-none focus:border-[#7BC950]" 
            value={filterStock} 
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option>All Stock Levels</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>No Stock</option>
          </select>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border-2 border-[#111827] rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
          <table className="w-full text-left">
            <thead className="bg-[#FEF9C3] border-b-2 border-[#111827]">
              <tr>
                <th className="p-5 text-xs font-black text-slate-800 w-24 text-center uppercase tracking-widest">Item #</th>
                <th className="p-5 text-xs font-black text-slate-800 uppercase tracking-widest">Item</th>
                <th className="p-5 text-xs font-black text-slate-800 text-center uppercase tracking-widest">Category</th>
                <th className="p-5 text-xs font-black text-slate-800 text-center uppercase tracking-widest">Current Qty</th>
                <th className="p-5 text-xs font-black text-slate-800 text-center uppercase tracking-widest">Avg Price</th>
                <th className="p-5 text-xs font-black text-slate-800 text-center uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map((ing, idx) => (
                <tr key={ing.id || idx} className="border-b-2 border-slate-100 hover:bg-slate-50 transition-all">
                  <td className="p-5 text-sm text-slate-500 text-center font-bold">{idx + 1}</td>
                  <td className="p-5 text-sm font-bold text-slate-800">{ing.item}</td>
                  <td className="p-5 text-sm text-slate-600 text-center font-medium">{ing.category}</td>
                  <td className="p-5 text-sm font-bold text-slate-800 text-center">{ing.qty} {ing.unit}</td>
                  <td className="p-5 text-sm font-bold text-slate-800 text-center">
                    {ing.price ? (String(ing.price).startsWith('P') ? ing.price : `P${ing.price}`) : 'P0'}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-8 py-2 rounded-full text-[12px] font-black border-2 inline-block min-w-[120px] shadow-sm ${getStatusStyle(ing.status)}`}>
                      {ing.status?.toUpperCase() || 'IN STOCK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-8">
          <p className="text-sm text-slate-500 font-bold">Showing Results: {filteredIngredients.length} items</p>
          <div className="flex gap-2">
            <button className="p-3 border-2 border-[#D1D5DB] rounded-xl text-slate-400 hover:bg-white hover:border-[#111827] transition-colors"><ChevronLeft size={20} /></button>
            <button className="px-6 py-3 bg-[#7BC950] text-white rounded-xl font-black text-sm border-2 border-[#111827]">1</button>
            <button className="px-6 py-3 bg-white border-2 border-[#D1D5DB] rounded-xl font-black text-sm text-slate-600">2</button>
            <button className="p-3 border-2 border-[#D1D5DB] rounded-xl text-slate-400 hover:bg-white hover:border-[#111827] transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-12 shadow-2xl border border-slate-100 relative">
            <h2 className="text-3xl font-black text-slate-900 mb-10 text-center tracking-tight">
              {formData.id ? "Edit Ingredient" : "Add New Ingredient"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Ingredient Name:</label>
                <input 
                  required 
                  className="flex-1 border-2 border-slate-200 rounded-full px-5 py-3 outline-none focus:border-[#7BC950] font-medium" 
                  placeholder="Enter Ingredient Name" 
                  value={formData.item} 
                  onChange={e => setFormData({...formData, item: e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Category:</label>
                <select 
                  required 
                  className="flex-1 border-2 border-slate-200 rounded-full px-5 py-3 bg-white appearance-none cursor-pointer focus:border-[#7BC950] font-medium" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="" disabled>Select Category</option>
                  <option>Vegetable</option><option>Meat</option><option>Fish</option><option>Dairy</option><option>Frozen</option><option>Canned</option><option>Baked</option>
                </select>
              </div>

              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Threshold:</label>
                <input 
                  required 
                  type="number" 
                  className="flex-1 border-2 border-slate-200 rounded-full px-5 py-3 outline-none focus:border-[#7BC950] font-medium" 
                  placeholder="Enter Threshold Limit" 
                  value={formData.threshold} 
                  onChange={e => setFormData({...formData, threshold: e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Unit:</label>
                <select 
                  required 
                  className="flex-1 border-2 border-slate-200 rounded-full px-5 py-3 bg-white appearance-none cursor-pointer focus:border-[#7BC950] font-medium" 
                  value={formData.unit} 
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                >
                  <option>pcs</option><option>kg</option><option>packs</option><option>grams</option><option>boxes</option>
                </select>
              </div>

              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Current Qty:</label>
                <input 
                  required 
                  type="number" 
                  className="flex-1 border-2 border-slate-200 rounded-full px-5 py-3 outline-none focus:border-[#7BC950] font-medium" 
                  placeholder="Enter Current Quantity" 
                  value={formData.qty} 
                  onChange={e => setFormData({...formData, qty: e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-44 text-sm font-black text-slate-800 uppercase tracking-wider">Avg Price:</label>
                <div className="flex-1 relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">P</span>
                  <input 
                    required 
                    type="number"
                    className="w-full border-2 border-slate-200 rounded-full pl-10 pr-5 py-3 outline-none focus:border-[#7BC950] font-medium" 
                    placeholder="0.00" 
                    value={formData.price.replace(/[P\s]/g, '')} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-10 justify-center">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="bg-[#B02A1F] text-white px-12 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all uppercase tracking-widest shadow-md"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="bg-[#7BC950] text-white px-12 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all uppercase tracking-widest shadow-md"
                >
                  SAVE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}