"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { ApiClient } from "@/lib/api";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    contact_number: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPendingModal, setShowPendingModal] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await ApiClient.post("/auth/register", {
        ...formData,
        role: "user", // Default role
        status: "pending" // Default status for admin approval
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Prefer a backend message if provided
        let message = "Registration failed. Please try again.";

        try {
          const errorData = JSON.parse(errorText);
          message = errorData.message || message;
        } catch {
          // Keep default message
        }

        // Handle common conflict case without throwing an error
        if (response.status === 409) {
          message = message || "Email or username already registered.";
        }

        setError(message);
        setIsLoading(false);
        return;
      }

      await response.json();
      setShowPendingModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-lg">
        
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Join StockMate</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Create your account to get started</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-xs uppercase">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="md:col-span-2">
            <input 
              name="full_name" 
              placeholder="FULL NAME" 
              required 
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={handleChange} 
            />
          </div>

          {/* Username */}
          <input 
            name="username" 
            placeholder="USERNAME" 
            required 
            className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
            onChange={handleChange} 
          />

          {/* Contact Number */}
          <input 
            name="contact_number" 
            placeholder="CONTACT #" 
            required 
            className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
            onChange={handleChange} 
          />

          {/* Email */}
          <div className="md:col-span-2">
            <input 
              name="email" 
              type="email" 
              placeholder="EMAIL ADDRESS" 
              required 
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={handleChange} 
            />
          </div>
          
          {/* Password */}
          <div className="md:col-span-2">
            <input 
              name="password" 
              type="password" 
              placeholder="PASSWORD" 
              required 
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={handleChange} 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="md:col-span-2 bg-[#6BCB3B] text-white py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-green-600 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Register Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-3">Already have an account?</p>
          <Link 
            href="/login" 
            className="inline-block w-full py-3 rounded-2xl border border-slate-200 bg-white font-black uppercase text-xs shadow-sm hover:bg-slate-50 transition-all"
          >
            Back to Login
          </Link>
        </div>
      </div>

      {showPendingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] border border-slate-200 shadow-2xl p-8 relative">
            <button
              onClick={() => {
                setShowPendingModal(false);
                router.push("/pending-approval");
              }}
              className="absolute top-4 right-4 p-2 rounded-full border border-slate-200 text-slate-500 hover:text-black"
            >
              <X size={18} />
            </button>
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Waiting for Admin Approval</h2>
            <p className="text-slate-500 mt-3">
              Your account has been created successfully. An admin needs to approve it before you can access the system.
            </p>
            <button
              onClick={() => {
                setShowPendingModal(false);
                router.push("/pending-approval");
              }}
              className="mt-6 w-full bg-[#6BCB3B] text-white py-3 rounded-2xl font-black uppercase shadow-sm hover:bg-green-600"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
