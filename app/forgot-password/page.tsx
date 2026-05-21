"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { AlertNotice } from "@/components/ui/feedback-dialog";
import { ApiClient } from "@/lib/api";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => (searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);
  const isRequiredReset = searchParams.get("required") === "1";
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });
  const pageTitle = isRequiredReset ? "Temporary Password" : "Forgot Password";
  const pageDescription = isRequiredReset
    ? "Enter your email address and continue to the password change form."
    : "Enter your email address and we will send a verification code so you can reset your password.";
  const submitLabel = isRequiredReset ? "Continue to Change Password" : "Send Verification Code";

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isRequiredReset) {
        router.push(`/reset-password?email=${encodeURIComponent(normalizedEmail)}&required=1`);
        return;
      }

      await ApiClient.post("/auth/forgot-password", {
        email: normalizedEmail,
        identifier: normalizedEmail,
      });

      router.push(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to send verification code.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-10 shadow-[0_30px_90px_rgba(47,111,79,0.12)]">
        <Link href="/login" className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
            <KeyRound size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{pageDescription}</p>
        </div>

        {isRequiredReset && (
          <div className="mb-6">
            <AlertNotice message="Your temporary password must be changed before you can use the system." variant="warning" />
          </div>
        )}

        {message.text && (
          <div className="mb-6">
            <AlertNotice message={message.text} variant={message.type === "error" ? "error" : "success"} />
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 font-black uppercase tracking-wide text-white transition hover:bg-[#285f44]"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
