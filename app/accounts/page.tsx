"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, UserX, Mail, Bell, Loader2, Check, X, Shield, Users
} from "lucide-react";
import { ApiClient } from "@/lib/api";
import RoleGuard from "@/components/auth/RoleGuard";

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
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showPending, setShowPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get("/api/users");
      if (res.ok) {
        const result = await res.json();
        console.debug("/api/users", result);

        if (result.success && Array.isArray(result.data)) {
          setUsers(result.data);
        } else if (Array.isArray(result)) {
          // Some APIs might return the array directly
          setUsers(result);
        }
      }

      // If accounts didn't return pending users, try fetching pending registrations separately
      try {
        const pendingRes = await ApiClient.get("/api/users/pending");
        if (pendingRes.ok) {
          const pendingResult = await pendingRes.json();
          console.debug("/api/users/pending", pendingResult);
          if (pendingResult.success && Array.isArray(pendingResult.data)) {
            setPendingUsers(pendingResult.data);
          } else if (Array.isArray(pendingResult)) {
            setPendingUsers(pendingResult);
          }
        }
      } catch (err) {
        // If endpoint isn't present, just keep pendingUsers empty
        console.warn("Pending accounts endpoint unavailable", err);
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

  useEffect(() => {
    if (showPending) {
      fetchAccounts();
    }
  }, [showPending]);

  const isPendingStatus = (status?: string, isActive?: boolean) => {
    const normalized = (status || "").toLowerCase().trim();
    if (normalized === "pending") return true;
    // Some backends may mark pending users as inactive without using the "pending" status
    if (isActive === false && normalized !== "approved" && normalized !== "denied") return true;
    return false;
  };

  const filteredUsers = (users || [])
    .filter(u => {
      const matchesSearch =
        (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "All Roles" ||
        (u.role || "").toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });

  const pendingUsersList = pendingUsers.length > 0
    ? pendingUsers
    : (users || []).filter(u => isPendingStatus(u.status, u.is_active));

  const handleApprove = async (userId: number) => {
    const role = selectedRoles[userId] || "staff"; // Default to staff if not picked
    
    setIsSubmitting(userId);
    try {
      const res = await ApiClient.patch(`/api/users/${userId}/status`, {
        status: "approved", // Matches your Go backend check
        is_active: true,
        role: role
      });

      if (res.ok) {
        fetchAccounts();
      }
    } catch {
      alert("Error approving user");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDeny = async (userId: number) => {
    if (!confirm("Are you sure? This will permanently delete this registration.")) return;
    
    setIsSubmitting(userId);
    try {
      await ApiClient.delete(`/api/users/${userId}`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F3F4F6] p-8">
        <div className="max-w-7xl mx-auto">
        
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">System Accounts</h1>
              <div className="flex items-center gap-2 mt-2">
                 <span className="bg-[#6BCB3B] w-2.5 h-2.5 rounded-full animate-pulse" />
                 <p className="text-slate-500 font-medium italic">Access Control Panel</p>
              </div>
            </div>
          
            <button 
              onClick={() => setShowPending(true)}
              className="group relative bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:border-slate-300 transition-all flex items-center gap-3"
            >
              <Bell size={20} className={pendingUsersList.length > 0 ? "animate-bounce text-slate-700" : "text-slate-700"} />
              <span className="font-bold text-sm text-slate-800">Review Requests</span>
              {pendingUsersList.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white min-w-7 h-7 px-2 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  {pendingUsersList.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by name, email, or username..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#76ba53] outline-none font-bold bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border-2 border-slate-200 rounded-2xl px-4 py-3 bg-white font-bold outline-none min-w-[180px]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="cook">Cook</option>
            </select>
          </div>

          {/* Main Users Table */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-slate-500" size={40}/>
                <p className="font-bold text-slate-400">Syncing database...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fff9c4] border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                    <tr>
                      <th className="p-5">User Profile</th>
                      <th className="p-5 text-center">Identity</th>
                      <th className="p-5">Assigned Role</th>
                      <th className="p-5">Account Status</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="p-16 text-center font-bold text-slate-400">No users found matching your search.</td></tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-white shadow-sm">
                                <Users size={20} />
                              </div>
                              <div>
                                <p className="font-black text-slate-800 leading-none">{user.full_name || "N/A"}</p>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 italic">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-2 underline decoration-[#6BCB3B] underline-offset-4">
                              <Mail size={12} /> {user.email}
                            </p>
                          </td>
                          <td className="p-5">
                            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 border-slate-200 bg-slate-50 text-slate-700">
                              {user.role}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                user.is_active
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : "bg-red-100 text-red-700 border-red-200"
                              }`}>
                                {user.is_active ? "Authorized" : "Deactivated"}
                              </span>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <button 
                              onClick={() => handleDeny(user.id)}
                              className="bg-red-50 border border-red-200 p-2.5 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                            >
                              <UserX size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Requests Modal */}
          {showPending && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl relative">
                <button 
                  onClick={() => setShowPending(false)}
                  className="absolute top-4 right-4 bg-slate-50 border border-slate-200 p-2 rounded-full hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-orange-100 p-3 rounded-2xl border border-orange-200">
                    <Shield size={28} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Approval Queue</h2>
                    <p className="text-sm text-slate-500 italic">Verify new team members</p>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                  {pendingUsersList.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                      <p className="font-bold text-slate-400">All caught up. No requests.</p>
                    </div>
                  ) : (
                    pendingUsersList.map(req => (
                      <div key={req.id} className="bg-slate-50 border border-slate-200 p-5 rounded-[1.5rem] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                          <p className="font-black text-xl leading-none mb-1 text-slate-800">{req.full_name}</p>
                          <p className="text-sm font-medium text-[#6BCB3B]">{req.email}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <select 
                            disabled={isSubmitting === req.id}
                            className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black uppercase outline-none"
                            onChange={(e) => setSelectedRoles(prev => ({ ...prev, [req.id]: e.target.value }))}
                            value={selectedRoles[req.id] || "staff"}
                          >
                            <option value="staff">Staff</option>
                            <option value="cook">Cook</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button 
                            disabled={isSubmitting === req.id}
                            onClick={() => handleApprove(req.id)}
                            className="bg-[#6BCB3B] p-2.5 rounded-xl text-white shadow-sm hover:bg-green-600 transition-all"
                          >
                            {isSubmitting === req.id ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                          </button>
                          
                          <button 
                            disabled={isSubmitting === req.id}
                            onClick={() => handleDeny(req.id)}
                            className="bg-white border border-slate-200 p-2.5 rounded-xl text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
