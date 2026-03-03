"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, Check, Trash2, Loader2, AlertCircle, 
  RefreshCcw 
} from "lucide-react";

const BACKEND_URL = "http://localhost:8080";

interface User { 
  id: number; 
  username: string; 
  email: string;
  role: string; 
  contact_number: string; 
  is_active: boolean; 
}

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState("Staff");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${BACKEND_URL}/auth/accounts`); 
      const result = await response.json();
      
      if (response.ok && result.success) {
        setUsers(result.data);
      } else {
        setError(result.message || "Failed to fetch users");
      }
    } catch (err) {
      setError("Connection error. Please check the backend database.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/user/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }), 
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      } else {
        alert(result.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Connection Error:", err);
      alert("Could not reach backend server.");
    }
  };

  const handleApproveRequest = async (user: User, role: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/user/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true })
      });
      
      if (res.ok) {
        setSelectedRequest(null);
        setShowModal(false);
        fetchUsers();
      }
    } catch (err) {
      alert("Failed to approve user");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/auth/user/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchUsers();
    } catch (err) { alert("Error deleting user"); }
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const pendingUsers = users.filter(u => !u.is_active);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b]">User Accounts</h1>
          <p className="text-slate-500 font-medium">Manage system access and roles</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={fetchUsers} className="p-3 text-slate-400 hover:text-blue-600 transition-colors">
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#1d4ed8] text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-3 shadow-lg"
          >
            Pending Requests 
            <span className="bg-white text-[#1d4ed8] text-[10px] px-2 py-0.5 rounded-full font-black">
              {pendingUsers.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <p className="font-semibold text-sm">{error}</p>
          <button onClick={fetchUsers} className="ml-auto bg-white px-3 py-1 rounded-lg border text-xs font-bold font-sans">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b-2 border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Role</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Contact</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
            ) : (
              users.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div>
                      <p className="text-gray-900 font-black uppercase tracking-tight">{acc.username}</p>
                      <p className="text-gray-400 text-xs font-medium">{acc.email}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 uppercase">
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center text-sm font-bold text-slate-500 italic">
                    {acc.contact_number}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end gap-1">
                      {/* TEXT LABELS: ACTIVE / INACTIVE */}
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                        acc.is_active ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        {/* ON/OFF Sub-label for clarity */}
                        <span className="text-[9px] font-bold text-slate-300 uppercase">
                          {acc.is_active ? 'ON' : 'OFF'}
                        </span>

                        {/* STATUS TOGGLE SWITCH */}
                        <button
                          onClick={() => handleToggleStatus(acc.id, acc.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${
                            acc.is_active ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                              acc.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pending Requests Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Requests</h2>
              <button onClick={() => { setShowModal(false); setSelectedRequest(null); }} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
            </div>
            
            <div className="p-8">
              {!selectedRequest ? (
                <div className="space-y-4">
                  {pendingUsers.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-bold">No pending requests.</div>
                  ) : (
                    pendingUsers.map((req) => (
                      <div key={req.id} className="flex justify-between items-center bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                        <div>
                          <p className="font-black text-gray-800 uppercase">{req.username}</p>
                          <p className="text-[10px] font-bold text-gray-400">{req.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedRequest(req)} className="p-3 bg-white text-green-600 border border-green-100 rounded-xl hover:bg-green-600 hover:text-white transition-all"><Check size={18}/></button>
                          <button onClick={() => handleReject(req.id)} className="p-3 bg-white text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Assign Role For</p>
                    <p className="text-2xl font-black text-gray-800 uppercase">{selectedRequest.username}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {['Staff', 'Cook', 'Admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`py-4 rounded-2xl text-xs font-black transition-all border-2 ${
                          selectedRole === role ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleApproveRequest(selectedRequest, selectedRole)} 
                    className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-colors"
                  >
                    Confirm and Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}