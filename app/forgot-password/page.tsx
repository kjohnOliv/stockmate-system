"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    
    try {
      const res = await ApiClient.post("/auth/forgot-password", { email });
      if (res.ok) {
        setStep(2);
        setMessage({ text: "Success! Code sent to your email.", type: "success" });
      } else {
        const errorText = await res.text();
        console.error("OTP send error:", res.status, errorText);
        if (res.status === 404) {
          setMessage({ text: "Email address not found.", type: "error" });
        } else {
          setMessage({ text: `Error: ${res.status}. Try again later.`, type: "error" });
        }
      }
    } catch (err: unknown) {
      console.error("OTP send exception:", err);
      setMessage({ text: "Server error. Try again later.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await ApiClient.post("/auth/verify-otp", { email, code });
      if (res.ok) {
        setStep(3);
        setMessage({ text: "Code verified! Reset your password below.", type: "success" });
      } else {
        const errorText = await res.text();
        console.error("OTP verify error:", res.status, errorText);
        if (res.status === 400) {
          setMessage({ text: "Invalid or expired code.", type: "error" });
        } else {
          setMessage({ text: `Error: ${res.status}. Try again later.`, type: "error" });
        }
      }
    } catch (err: unknown) {
      console.error("OTP verify exception:", err);
      setMessage({ text: "Verification failed.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "Passwords do not match!", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiClient.post("/auth/change-password", { email, password: passwords.new });
      if (res.ok) {
        setMessage({ text: "Password updated! Redirecting to login...", type: "success" });
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const errorText = await res.text();
        console.error("Password change error:", res.status, errorText);
        setMessage({ text: `Failed to update password: ${res.status}`, type: "error" });
      }
    } catch (err: unknown) {
      console.error("Password change exception:", err);
      setMessage({ text: "An error occurred.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md">
        
        <Link href="/login" className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-black transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">
          {step === 1 && "Reset Access"}
          {step === 2 && "Verify Identity"}
          {step === 3 && "New Password"}
        </h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-8">
          {step === 1 && "Enter your email to receive a recovery code."}
          {step === 2 && `We sent a code to ${email}`}
          {step === 3 && "Secure your account with a new password."}
        </p>

        {message.text && (
          <div className={`mb-6 p-4 border rounded-2xl flex items-center gap-3 font-bold text-xs uppercase ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p>{message.text}</p>
          </div>
        )}

        {/* STEP 1: REQUEST CODE */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button 
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-slate-800 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Send Code"}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input
              type="text"
              placeholder="6-DIGIT CODE"
              maxLength={6}
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold text-center tracking-[0.5em] outline-none focus:border-[#6BCB3B]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button 
              disabled={isLoading}
              className="w-full bg-[#6BCB3B] text-white py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-green-600 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Verify Code"}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="w-full text-[10px] font-black uppercase text-gray-400 hover:text-black"
            >
              Wrong email? Go back
            </button>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input
              type="password"
              placeholder="NEW PASSWORD"
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="CONFIRM NEW PASSWORD"
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              required
            />
            <button 
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-slate-800 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
