"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Save, Shield, User } from "lucide-react";
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ full_name: "", contact_number: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", next: "", confirm: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

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
      setPageError(null);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setPageError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setPageError("No user session found. Please log in again.");
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [fetchProfile, user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      setIsSaving(true);
      setFormError("");
      setSuccess("");
      await ApiClient.put(`/api/profile/${user.id}`, editData);
      await fetchProfile();
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Profile save error:", err);
      setFormError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    setFormError("");
    setSuccess("");

    if (!passwordData.current.trim()) {
      setFormError("Current password is required.");
      return;
    }
    if (!passwordData.next.trim()) {
      setFormError("New password is required.");
      return;
    }
    if (!passwordData.confirm.trim()) {
      setFormError("Please confirm your new password.");
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      setFormError("New password and confirmation do not match.");
      return;
    }
    if (passwordData.next.length < 8 || !/[A-Z]/.test(passwordData.next) || !/[0-9]/.test(passwordData.next)) {
      setFormError("New password must be at least 8 characters and include 1 uppercase letter and 1 number.");
      return;
    }

    try {
      setIsChangingPassword(true);
      const payload = {
        email: profile.email,
        password: passwordData.next,
        old_password: passwordData.current,
        oldPassword: passwordData.current,
        current_password: passwordData.current,
        currentPassword: passwordData.current,
        new_password: passwordData.next,
        newPassword: passwordData.next,
      };

      await ApiClient.post("/auth/change-password", payload);
      setPasswordData({ current: "", next: "", confirm: "" });
      setSuccess("Password changed successfully. Redirecting to login...");
      setTimeout(() => {
        logout();
        router.replace("/login");
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to change password";

      if (message.toLowerCase().includes("otp verification required")) {
        try {
          await ApiClient.post("/auth/forgot-password", {
            email: profile.email,
            identifier: profile.email,
          });

          setSuccess("Verification code sent. Continue to OTP verification to finish changing your password.");
          router.push(`/verify-otp?email=${encodeURIComponent(profile.email)}`);
          return;
        } catch {
          setFormError("OTP verification is required. We could not send a code automatically. Please use the forgot password flow.");
          return;
        }
      }

      setFormError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#2f6f4f]" size={40} />
      </div>
    );
  }

  if (pageError || (!profile && !loading)) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white p-4">
        <div className="max-w-md rounded-[1.5rem] border border-red-100 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
          <p className="text-lg font-black text-red-700">Connection Error</p>
          <p className="mt-2 text-sm text-red-600">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-3 md:px-4">
      <header className="mb-5">
        <h1 className="text-[2rem] font-black text-slate-900">Account Profile</h1>
        <p className="mt-1 text-[13px] font-medium text-[#2f6f4f]">Manage your account details in one form.</p>
      </header>
      {success && <div className="mb-4"><AlertNotice message={success} variant="success" /></div>}
      {formError && <div className="mb-4"><AlertNotice message={formError} variant="error" /></div>}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.5rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Profile Information</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full Name</label>
              <input
                type="text"
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Username</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-700">
                <User size={18} className="text-slate-400" /> {profile?.username}
              </div>
            </div>
            <div className="min-w-0 md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email Address</label>
              <div className="flex min-h-[48px] items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-700">
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
                disabled={!isEditing}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">System Role</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-700">
                <Shield size={18} className="text-slate-400" /> {(profile?.role || "N/A").toUpperCase()}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f4f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#285f44]"
              >
                <User size={18} />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f4f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#285f44] disabled:opacity-70"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditData({
                      full_name: profile?.full_name || "",
                      contact_number: profile?.contact_number || "",
                    });
                    setIsEditing(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[1.5rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="mb-2.5 text-lg font-black text-slate-900">Security</h2>
            <p className="mb-4 text-[13px] font-medium text-slate-500">Update your password. If your account needs OTP verification, we&apos;ll send a code and continue the secure reset flow.</p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  placeholder="Current Password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-12 font-bold outline-none focus:border-emerald-500"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData((current) => ({ ...current, current: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => ({ ...current, current: !current.current }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasswords.next ? "text" : "password"}
                  placeholder="New Password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-12 font-bold outline-none focus:border-emerald-500"
                  value={passwordData.next}
                  onChange={(e) => setPasswordData((current) => ({ ...current, next: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => ({ ...current, next: !current.next }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPasswords.next ? "Hide new password" : "Show new password"}
                >
                  {showPasswords.next ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-[#2f6f4f]">
                New password must be at least 8 characters and include 1 uppercase letter and 1 number.
              </p>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-12 font-bold outline-none focus:border-emerald-500"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData((current) => ({ ...current, confirm: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => ({ ...current, confirm: !current.confirm }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPasswords.confirm ? "Hide confirmation password" : "Show confirmation password"}
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="mt-3 inline-flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              {isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Save Changes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
