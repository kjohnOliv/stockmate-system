"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { AlertNotice } from "@/components/ui/feedback-dialog";
import { ApiClient } from "@/lib/api";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await ApiClient.post("/auth/verify-otp", {
        email,
        otp,
        code: otp,
      });

      router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Invalid verification code.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-10 shadow-[0_30px_90px_rgba(47,111,79,0.12)]">
        <Link href="/forgot-password" className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700">
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Verify OTP</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Enter the verification code sent to {email || "your email"}.
          </p>
        </div>

        {message.text && (
          <div className="mb-6">
            <AlertNotice message={message.text} variant={message.type === "error" ? "error" : "success"} />
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter OTP code"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <button
            disabled={isLoading || !email}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 font-black uppercase tracking-wide text-white transition hover:bg-[#285f44] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Verify Code"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
