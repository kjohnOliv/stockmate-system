"use client";
import React, { useState, useEffect } from 'react';
import { 
  Search, UserCheck, UserX, 
  MoreVertical, Mail, Bell,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";

// --- TYPES ---
interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  contact_number: string;
  status: string;
  is_active: boolean;
}

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showPending, setShowPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  // 1. Fetch data from Go Backend
  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/accounts");
      const result = await res.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 2. Filter Logic
  const filteredUsers = users.filter(u => u.status !== 'pending').filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleRoleChange = (userId: number, role: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: role }));
  };

  // 3. Approve Action (Connects to handleToggleStatus in main.go)
  const handleApprove = async (userId: number) => {
    const role = selectedRoles[userId];
    if (!role || role === "Select Role") {
      alert("Please select a role before approving.");
      return;
    }

    setIsSubmitting(userId);
    try {
      const res = await fetch(`http://localhost:8080/auth/user/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "active",
          is_active: true,
          role: role
        })
      });

      if (res.ok) {
        alert("Account Approved!");
        fetchAccounts(); // Refresh list
      }
    } catch (err) {
      alert("Error approving user");
    } finally {
      setIsSubmitting(null);
    }
  };

  // 4. Deny/Delete Action
  const handleDeny = async (userId: number) => {
    if (!confirm("Are you sure you want to deny this request?")) return;
    
    setIsSubmitting(userId);
    try {
      await fetch(`http://localhost:8080/auth/user/${userId}`, { method: "DELETE" });
      fetchAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-8 max-w-7xl mx-auto bg-[#fdfbe9] min-h-screen font-sans">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">User Accounts</h1>
            <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Manage access and pending requests</p>
          </div>
          
          <button 
            onClick={() => setShowPending(true)}
            className="bg-[#2D3142] text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-lg relative"
          >
            <Bell size={18} />
            Pending Requests
            {pendingUsers.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-4 border-[#fdfbe9]">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border-4 border-[#F3EBC7] p-4 rounded-[2rem] shadow-sm mb-8 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-[#6BCB3B] rounded-xl outline-none font-bold transition-all text-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 p-1 rounded-xl">
            {["All Roles", "Admin", "Staff", "Cook"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                  roleFilter === role ? "bg-white shadow-md text-[#6BCB3B]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white border-4 border-[#F3EBC7] rounded-[2.5rem] overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#6BCB3B]" size={40}/></div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#FFFBE6] border-b-4 border-[#F3EBC7]">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">ID</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#F3EBC7]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 font-bold text-slate-400 text-sm">#{user.id}</td>
                    <td className="p-6">
                      <p className="font-black text-slate-800 uppercase text-sm">{user.full_name || user.username}</p>
                      <p className="text-[10px] font-bold text-slate-400 lowercase">{user.email}</p>
                    </td>
                    <td className="p-6 font-bold text-slate-600 text-sm">{user.contact_number || "N/A"}</td>
                    <td className="p-6">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-[#6BCB3B]' : 'bg-slate-300'}`} />
                        <span className="font-black text-[10px] uppercase text-slate-600">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => handleDeny(user.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600 shadow-sm border border-transparent"
                      >
                        <UserX size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Requests Modal */}
        {showPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] border-8 border-[#F3EBC7] w-full max-w-2xl shadow-2xl">
              <div className="p-8 border-b-4 border-[#F3EBC7] flex justify-between items-center bg-[#FFFBE6] rounded-t-[2.3rem]">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Pending Requests</h2>
                <button onClick={() => setShowPending(false)} className="text-slate-400 hover:text-black font-black uppercase text-xs">CLOSE</button>
              </div>
              
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                {pendingUsers.length === 0 ? (
                   <p className="text-center font-bold text-slate-400 uppercase text-xs py-10">No pending requests</p>
                ) : pendingUsers.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl group transition-all">
                    <div className="flex-1">
                      <p className="font-black text-slate-800 uppercase text-sm">{req.full_name || req.username}</p>
                      <div className="flex gap-3 text-[10px] font-bold text-slate-400 uppercase">
                        <span className="flex items-center gap-1"><Mail size={12}/> {req.email}</span>
                        <span>|</span>
                        <span>{req.contact_number}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <select 
                        onChange={(e) => handleRoleChange(req.id, e.target.value)}
                        className="bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none text-black"
                      >
                        <option>Select Role</option>
                        <option value="staff">Staff</option>
                        <option value="cook">Cook</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button 
                        disabled={isSubmitting === req.id}
                        onClick={() => handleDeny(req.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 disabled:opacity-50"
                      >
                        Deny
                      </button>

                      <button 
                        disabled={isSubmitting === req.id}
                        onClick={() => handleApprove(req.id)}
                        className="bg-[#6BCB3B] text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#58a830] disabled:opacity-50"
                      >
                        {isSubmitting === req.id ? <Loader2 className="animate-spin" size={14}/> : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}