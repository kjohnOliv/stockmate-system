"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api";
import { AlertCircle, Loader2, Lock, Mail, Save, Shield, User } from "lucide-react";
import { AlertNotice } from "@/components/ui/feedback-dialog";

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  role: string;
  requested_role?: string;
  status: string;
  is_active: boolean;
  contact_number?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ full_name: "", contact_number: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await ApiClient.get(`/api/profile/${user.id}`);
      const data = await res.json();
      const profileData = data.data || data;
      setProfile(profileData);
      setEditData({
        full_name: profileData.full_name || "",
        contact_number: profileData.contact_number || ""
      });
      setError(null);
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
  }, [fetchProfile, user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      setIsSaving(true);
      setSuccess("");
      await ApiClient.put(`/api/profile/${user.id}`, editData);
      await fetchProfile();
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#2f6f4f]" size={40} />
      </div>
    );
  }

  if (error || (!profile && !loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="max-w-md rounded-[2rem] border border-red-100 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
          <p className="text-lg font-black text-red-700">Connection Error</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Account Profile</h1>
        <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Manage your account details in one form.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-slate-900">Profile Information</h2>
          {success && <div className="mb-4"><AlertNotice message={success} variant="success" /></div>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full Name</label>
              <input
                type="text"
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Username</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700">
                <User size={18} className="text-slate-400" /> {profile?.username}
              </div>
            </div>
            <div className="min-w-0 md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email Address</label>
              <div className="flex min-h-[56px] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700">
                <Mail size={18} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 break-all text-sm leading-6">{profile?.email}</span>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Contact Number</label>
              <input
                type="tel"
                value={editData.contact_number}
                onChange={(e) => setEditData({ ...editData, contact_number: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">System Role</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700">
                <Shield size={18} className="text-slate-400" /> {(profile?.role || "N/A").toUpperCase()}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6f4f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#285f44] disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-xl font-black text-slate-900">Account Access</h2>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Account Status</p>
                <p className="mt-2 text-sm font-black text-slate-800">{(profile?.status || "Not Provided").toUpperCase()}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Requested Role</p>
                <p className="mt-2 text-sm font-black text-slate-800">{(profile?.requested_role || profile?.role || "Not Provided").toUpperCase()}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Activation</p>
                <p className="mt-2 text-sm font-black text-slate-800">{profile?.is_active ? "ACTIVE" : "INACTIVE"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
            <h2 className="mb-3 text-xl font-black text-slate-900">Security</h2>
            <p className="mb-5 text-sm font-medium text-slate-500">Change your password from the dedicated page.</p>
            <button
              onClick={() => router.push("/forgot-password")}
              className="inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Lock size={18} /> Change Password
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
