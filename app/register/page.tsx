"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { ApiClient } from "@/lib/api";
import { AppSelect } from "@/components/ui/app-select";

type RegisterForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  username: string;
  email: string;
  contact_number: string;
  requested_role: "staff" | "cook" | "admin";
};

const initialForm: RegisterForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  username: "",
  email: "",
  contact_number: "",
  requested_role: "staff",
};

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPendingModal, setShowPendingModal] = useState(false);

  const fullName = useMemo(
    () =>
      [formData.first_name, formData.middle_name, formData.last_name]
        .map((value) => toTitleCase(value))
        .filter(Boolean)
        .join(" "),
    [formData.first_name, formData.middle_name, formData.last_name]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await ApiClient.post("/auth/register", {
        ...formData,
        first_name: toTitleCase(formData.first_name),
        middle_name: toTitleCase(formData.middle_name),
        last_name: toTitleCase(formData.last_name),
        full_name: fullName,
        email: formData.email.trim().toLowerCase(),
        requested_role: formData.requested_role,
        role: formData.requested_role,
        status: "pending",
      });

      setShowPendingModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4 text-black">
      <div className="w-full max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-[0_30px_90px_rgba(47,111,79,0.12)] md:p-10">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
            <UserPlus size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Fill in your details and request the access role you need.</p>
        </header>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">First Name</label>
              <input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Juan"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Middle Name</label>
              <input
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                placeholder="Santos"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Last Name</label>
              <input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Dela Cruz"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="juandelacruz"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Contact Number</label>
              <input
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email Address</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Requested Role Access</label>
              <AppSelect
                value={formData.requested_role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, requested_role: value as RegisterForm["requested_role"] }))}
                className="w-full px-4 py-3 font-bold"
                options={[
                  { label: "Staff", value: "staff" },
                  { label: "Cook", value: "cook" },
                  { label: "Admin", value: "admin" },
                ]}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#285f44] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Submit Account Request"}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Already registered?</p>
          <Link href="/login" className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Back to Login
          </Link>
        </div>
      </div>

      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Account Request Sent</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              Your account is now pending admin review. Requested role: <span className="font-black text-[#2f6f4f]">{formData.requested_role.toUpperCase()}</span>.
              Once approved, you can log in using your temporary password and the system will bring you directly to the admin dashboard after you change it.
            </p>
            <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#285f44]">
              Go to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
