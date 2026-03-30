"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { ApiClient } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await ApiClient.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setMessage({ text: "Recovery code sent to your email.", type: "success" });
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 700);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Unable to send recovery code.";
      setMessage({
        text: errorText.toLowerCase().includes("404") ? "Email address not found." : errorText,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4 text-black font-sans">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-10 shadow-2xl">
        <Link href="/login" className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 transition-colors hover:text-black">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef6df] text-[#2f6f4f]">
            <Mail size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Email Recovery</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter the account email and we&apos;ll send a one-time code for password reset.
          </p>
        </div>

        {message.text && (
          <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold uppercase ${message.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-green-200 bg-green-50 text-green-600"}`}>
            {message.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSendOTP} className="space-y-4">
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-[#6BCB3B]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 font-black uppercase text-white shadow-sm transition-all hover:bg-[#285f44]"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Send OTP to Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
