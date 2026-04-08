"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { AlertNotice, FeedbackDialog } from "@/components/ui/feedback-dialog";
import { ApiClient } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);
  const isRequiredReset = searchParams.get("required") === "1";

  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwords.old.trim()) {
      setMessage({ text: "Temporary password is required.", type: "error" });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    if (passwords.new.length < 8 || !/[A-Z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) {
      setMessage({ text: "New password must be at least 8 characters and include 1 uppercase letter and 1 number.", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const payload = {
        email,
        password: passwords.new,
        new_password: passwords.new,
        newPassword: passwords.new,
        old_password: passwords.old,
        oldPassword: passwords.old,
        current_password: passwords.old,
        currentPassword: passwords.old,
      };

      await ApiClient.post("/auth/change-password", payload);
      setMessage({ text: "Password updated successfully.", type: "success" });
      setDialogOpen(true);
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
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-10 shadow-2xl">
          <h1 className="text-2xl font-black text-slate-900">Change Password</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Open this page from the login or temporary-password flow so your account email is included.
          </p>
          <Link href="/forgot-password" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#285f44]">
            Go to Temporary Password Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-10 shadow-[0_30px_90px_rgba(47,111,79,0.12)]">
        <Link href="/login" className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Change Password</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {isRequiredReset
              ? `Use the temporary password for ${email}, then set your new password.`
              : `Update the password for ${email}.`}
          </p>
        </div>

        <div className="mb-6">
          <AlertNotice
            variant="warning"
            message="Password format: at least 8 characters, with at least 1 uppercase letter and 1 number."
          />
        </div>

        {message.text && (
          <div className="mb-6">
            <AlertNotice message={message.text} variant={message.type === "error" ? "error" : "success"} />
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Temporary Password"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            value={passwords.old}
            onChange={(e) => setPasswords((current) => ({ ...current, old: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            value={passwords.new}
            onChange={(e) => setPasswords((current) => ({ ...current, new: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            value={passwords.confirm}
            onChange={(e) => setPasswords((current) => ({ ...current, confirm: e.target.value }))}
            required
          />
          <button
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 font-black uppercase tracking-wide text-white transition hover:bg-[#285f44] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Change Password"}
          </button>
        </form>
      </div>

      <FeedbackDialog
        open={dialogOpen}
        title="Password Updated"
        message="Your password has been changed successfully. Continue to login."
        variant="success"
        confirmLabel="Go to Login"
        onConfirm={() => {
          setDialogOpen(false);
          router.push("/login");
        }}
      />
    </div>
  );
}
