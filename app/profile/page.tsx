"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext"; 
import { 
  Loader2, Pencil, User, Mail, Phone, 
  Shield, CheckCircle, AlertCircle, Lock 
} from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  contact_number: string;
  is_active: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth(); 
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.id || parsedUser?.id;

      if (!userId) {
        setError("No user session found. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await fetch(`http://localhost:8080/auth/user/${userId}`);
        
        if (!response.ok) {
          throw new Error(`User profile not found (Status: ${response.status})`);
        }

        const data = await response.json();
        setProfile(data);
      } catch (err: any) {
        console.error("Profile Fetch Error:", err);
        setError(err.message || "Unable to load profile. Please check if the Go server is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

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
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Profile</h1>
          <p className="text-gray-500 text-sm font-medium">Manage your personal information and security</p>
        </div>
        <button className="bg-[#63c63e] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-sm hover:shadow-lg transition-all active:scale-95 shadow-md shadow-green-100">
          <Pencil size={16} /> Edit Profile
        </button>
      </header>

      {/* Profile Table Information */}
      <div className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm mb-10">
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

            {/* Contact Row */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="px-8 py-6 flex items-center gap-3 text-slate-600 font-bold">
                <Phone size={18} className="text-slate-400" /> Contact Number
              </td>
              <td className="px-8 py-6 text-gray-900 font-black">
                {profile?.contact_number || "Not Provided"}
              </td>
              <td className="px-8 py-6 text-right">
                <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500">PRIMARY</span>
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
      <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-gray-900"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Security & Password</h2>
            <p className="text-sm text-gray-500">Last updated password: 1 month ago</p>
          </div>
          <button className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95">
            <Lock size={18} /> Change Password
          </button>
        </div>
      </div>
    </div>
  );
}