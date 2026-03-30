"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api";
import { useBodyModalState } from "@/hooks/useBodyModalState";
import { 
  Loader2, Pencil, User, Mail,
  Shield, CheckCircle, AlertCircle, Lock, Save, X
} from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  contact_number?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", contact_number: "" });
  const [isSaving, setIsSaving] = useState(false);

  useBodyModalState(isEditing);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await ApiClient.get(`/api/profile/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const profileData = data.data || data;
        setProfile(profileData);
        setEditData({
          full_name: profileData.full_name || "",
          contact_number: profileData.contact_number || ""
        });
        setError(null);
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setError("No user session found. Please log in again.");
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [user, fetchProfile]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      setIsSaving(true);
      const res = await ApiClient.put(`/api/profile/${user.id}`, editData);
      if (res.ok) {
        await fetchProfile();
        setIsEditing(false);
      } else {
        setError("Failed to update profile");
      }
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-[#63c63e] mb-4" size={48} />
        <p className="text-gray-500 font-medium tracking-wide">Fetching your details...</p>
      </div>
    );
  }

  // Error State
  if (error || (!profile && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <div className="bg-red-50 p-8 rounded-[32px] border-2 border-red-100 max-w-md text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
          <p className="text-red-600 font-black mb-2 text-lg">Connection Error</p>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[72rem] px-2 py-3 animate-in fade-in slide-in-from-bottom-4 duration-700 md:px-3">
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-slate-200 bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Edit Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BCB3B]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={editData.contact_number}
                  onChange={(e) => setEditData({...editData, contact_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BCB3B]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 bg-[#6BCB3B] hover:bg-[#5ab52b] text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? "SAVING..." : "SAVE"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <X size={18} /> CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Profile</h1>
          <p className="text-gray-500 text-sm font-medium">Manage your personal information and security</p>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="bg-[#6BCB3B] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-sm hover:shadow-lg transition-all active:scale-95 shadow-md shadow-green-100"
        >
          <Pencil size={16} /> Edit Profile
        </button>
      </header>

      {/* Profile Table Information */}
      <div className="mb-8 overflow-hidden rounded-[1.1rem] border-2 border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b-2 border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Information Field</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Your Details</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Username Row */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-6 flex items-center gap-3 text-slate-600 font-bold">
                <User size={18} className="text-slate-400" /> Username
              </td>
              <td className="px-8 py-6 text-gray-900 font-black">{profile?.username}</td>
              <td className="px-8 py-6 text-right"><CheckCircle size={18} className="text-green-500 ml-auto" /></td>
            </tr>

            {/* Email Row */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-6 flex items-center gap-3 text-slate-600 font-bold">
                <Mail size={18} className="text-slate-400" /> Email Address
              </td>
              <td className="px-8 py-6 text-gray-900 font-black">{profile?.email}</td>
              <td className="px-8 py-6 text-right"><CheckCircle size={18} className="text-green-500 ml-auto" /></td>
            </tr>

            {/* Status Row */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-6 flex items-center gap-3 text-slate-600 font-bold">
                <CheckCircle size={18} className="text-slate-400" /> Account Status
              </td>
              <td className="px-8 py-6 text-gray-900 font-black uppercase">
                {profile?.status || "Not Provided"}
              </td>
              <td className="px-8 py-6 text-right">
                <span className="text-[10px] font-black bg-green-100 px-2 py-1 rounded text-green-600">{profile?.is_active ? "ACTIVE" : "INACTIVE"}</span>
              </td>
            </tr>

            {/* Role Row */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-6 flex items-center gap-3 text-slate-600 font-bold">
                <Shield size={18} className="text-slate-400" /> System Role
              </td>
              <td className="px-8 py-6">
                <span className="bg-blue-50 text-blue-600 text-xs font-black px-3 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">
                  {profile?.role}
                </span>
              </td>
              <td className="px-8 py-6 text-right font-black text-[10px] text-blue-600">AUTHORIZED</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Security Section */}
      <div className="relative overflow-hidden rounded-[1.1rem] border-2 border-slate-100 bg-white p-8 shadow-sm">
        <div className="absolute top-0 left-0 w-2 h-full bg-gray-900"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Security & Password</h2>
            <p className="text-sm text-gray-500">Last updated password: 1 month ago</p>
          </div>
          <button
            onClick={() => router.push("/forgot-password")}
            className="flex items-center justify-center gap-3 rounded-xl bg-black px-8 py-4 text-sm font-black text-white transition-all hover:bg-gray-800 active:scale-95"
          >
            <Lock size={18} /> Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
