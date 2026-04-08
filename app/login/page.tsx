"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Invalid email or password.");
      }

      const userData = data.data;
      const authToken =
        userData?.token ??
        userData?.access_token ??
        userData?.accessToken ??
        userData?.jwt ??
        data?.token ??
        data?.access_token ??
        data?.accessToken ??
        data?.jwt;

      if (!userData.is_active) throw new Error("Account is inactive.");

      if (String(userData.status || "").toLowerCase() === "pending") {
        router.push("/pending-approval");
        return;
      }

      if (userData.must_change_password) {
        router.replace(`/reset-password?email=${encodeURIComponent(userData.email)}&required=1`);
        return;
      }

      login({
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name,
        first_name: userData.first_name,
        middle_name: userData.middle_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
        requested_role: userData.requested_role,
        status: userData.status,
        is_active: userData.is_active,
        must_change_password: userData.must_change_password,
        token: authToken,
      });

      setSuccessOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5ef] p-4 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-10 shadow-[0_30px_90px_rgba(47,111,79,0.12)]">
        <header className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 shadow-sm">
            <Image src="/logo.png" alt="Logo" width={96} height={96} className="h-full w-full object-cover" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">StockMate</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Sign in to continue.</p>
        </header>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            required
            className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
            onChange={handleChange}
            value={formData.email}
          />

          <div className="space-y-2">
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="w-full rounded-2xl border border-slate-200 p-4 font-bold outline-none focus:border-emerald-500"
              onChange={handleChange}
              value={formData.password}
            />
            <div className="flex justify-end pr-2">
              <Link href="/forgot-password" className="text-[11px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700">
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2f6f4f] py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#285f44] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Login Account"}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">No account yet?</p>
          <Link href="/register" className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Create New Account
          </Link>
        </div>
      </div>

      <FeedbackDialog
        open={successOpen}
        title="Login Successful"
        message="Your account is ready. You will be redirected to the admin dashboard."
        variant="success"
        confirmLabel="Continue"
        onConfirm={() => {
          setSuccessOpen(false);
          router.replace("/dashboard");
        }}
      />
    </div>
  );
}
