"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ApiClient } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);

  const [code, setCode] = useState("");
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await ApiClient.post("/auth/verify-otp", { email, code });
      setIsVerified(true);
      setMessage({ text: "OTP verified. You can now set a new password.", type: "success" });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Invalid or expired OTP.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await ApiClient.post("/auth/change-password", { email, password: passwords.new });
      setMessage({ text: "Password updated. Redirecting to login...", type: "success" });
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update password.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-2xl">
          <AlertCircle className="mx-auto mb-4 text-blue-500" size={48} />
          <h1 className="mb-4 text-2xl font-black text-gray-900">Password Reset</h1>
          <p className="mb-6 text-gray-600">Start with the email step so we know where to send your OTP.</p>
          <Link href="/forgot-password" className="block w-full rounded-xl bg-[#2f6f4f] px-6 py-3 font-black text-white transition hover:bg-[#285f44]">
            Go to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4 text-black font-sans">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-10 shadow-2xl">
        <Link href="/forgot-password" className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 transition-colors hover:text-black">
          <ArrowLeft size={14} /> Back to Email Step
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef6df] text-[#2f6f4f]">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
            {isVerified ? "Create New Password" : "Verify OTP"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isVerified ? `Resetting password for ${email}` : `Enter the code sent to ${email}`}
          </p>
        </div>

        {message.text && (
          <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold uppercase ${message.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-green-200 bg-green-50 text-green-600"}`}>
            {message.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p>{message.text}</p>
          </div>
        )}

        {!isVerified ? (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input
              type="text"
              placeholder="6-DIGIT OTP"
              maxLength={6}
              className="w-full rounded-2xl border border-slate-200 p-4 text-center font-bold tracking-[0.5em] outline-none focus:border-[#6BCB3B]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#2f6f4f] py-4 font-black uppercase text-white shadow-sm transition-all hover:bg-[#285f44]"
            >
              {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Verify OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input
              type="password"
              placeholder="NEW PASSWORD"
              className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-[#6BCB3B]"
              value={passwords.new}
              onChange={(e) => setPasswords((current) => ({ ...current, new: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="CONFIRM NEW PASSWORD"
              className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-[#6BCB3B]"
              value={passwords.confirm}
              onChange={(e) => setPasswords((current) => ({ ...current, confirm: e.target.value }))}
              required
            />
            <button
              disabled={isLoading}
              className="w-full rounded-2xl bg-black py-4 font-black uppercase text-white shadow-sm transition-all hover:bg-slate-800"
            >
              {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
