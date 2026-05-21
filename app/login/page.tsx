"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isRedirecting) return;
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 3500);
    return () => clearTimeout(timer);
  }, [isRedirecting, router]);

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
          identifier: formData.username.trim().toLowerCase(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error("Incorrect email or password.");
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

      setIsRedirecting(true);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(118,186,83,0.14),_transparent_32%),linear-gradient(135deg,_#f8f9f1_0%,_#eef5e7_52%,_#fcfdf8_100%)] text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-3 py-3 sm:px-5 sm:py-5 lg:h-screen lg:px-6 lg:py-2">
        <div className="grid w-full gap-4 lg:h-[calc(100vh-1rem)] lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,395px)] lg:gap-4">
          <section className="relative overflow-hidden rounded-[1.8rem] border border-emerald-100/80 bg-[linear-gradient(145deg,_rgba(255,251,217,0.93)_0%,_rgba(240,247,230,0.9)_58%,_rgba(229,243,225,0.92)_100%)] px-5 py-4 shadow-[0_22px_64px_rgba(47,111,79,0.10)] sm:px-7 sm:py-6 lg:h-full lg:px-8 lg:py-6">
            <div className="absolute -left-14 top-4 h-36 w-36 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-lime-200/30 blur-3xl" />

            <div className="relative flex h-full flex-col">
              <div className="mb-2 flex w-full max-w-[250px] items-center lg:max-w-[270px]">
                <Image src="/stockmate-transparent.png" alt="StockMate logo" width={640} height={256} className="h-auto w-full object-contain" priority />
              </div>

              <div className="max-w-[900px]">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#2f6f4f]">Smart Canteen Management</p>
                <h1 className="max-w-[20ch] text-[2.25rem] font-black leading-[0.98] tracking-tight text-slate-900 sm:text-[2.5rem] lg:text-[2.9rem]">
                  Organize meals, track stock, and move faster.
                </h1>
                <p className="mt-2 max-w-[760px] text-[0.95rem] leading-6 text-slate-600">
                  StockMate keeps inventory, meal planning, and canteen operations in one system built for daily school use.
                </p>
              </div>

              <div className="mt-4 grid gap-3 px-2 pb-2 md:grid-cols-3">
                <div className="rounded-[1rem] border border-emerald-100/80 bg-white/82 px-5 py-3.5 shadow-sm backdrop-blur">
                  <p className="text-[1rem] font-bold text-[#2f6f4f]">Track</p>
                  <p className="mt-1.5 text-[0.9rem] leading-6 text-slate-600">Watch stock levels and shortages before service starts.</p>
                </div>
                <div className="rounded-[1rem] border border-emerald-100/80 bg-white/82 px-5 py-3.5 shadow-sm backdrop-blur">
                  <p className="text-[1rem] font-bold text-[#2f6f4f]">Plan</p>
                  <p className="mt-1.5 text-[0.9rem] leading-6 text-slate-600">Handle menus, meals, and ingredient preparation clearly.</p>
                </div>
                <div className="rounded-[1rem] border border-emerald-100/80 bg-white/82 px-5 py-3.5 shadow-sm backdrop-blur">
                  <p className="text-[1rem] font-bold text-[#2f6f4f]">Serve</p>
                  <p className="mt-1.5 text-[0.9rem] leading-6 text-slate-600">Keep staff aligned with cleaner daily records.</p>
                </div>
              </div>

              <div className="mt-3 px-2 pb-2 lg:mt-auto">
                <div className="rounded-[1rem] border border-emerald-200/70 bg-[#2f6f4f] px-6 py-4 text-white shadow-lg shadow-emerald-900/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">One Workflow</p>
                  <p className="mt-1.5 max-w-xl text-[0.9rem] leading-6 text-emerald-50/95">
                    Purchasing, planning, and service stay connected in one tighter system.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[395px] rounded-[1.8rem] border border-emerald-100/90 bg-white/98 p-6 shadow-[0_22px_64px_rgba(47,111,79,0.12)] backdrop-blur sm:p-7 lg:min-h-0 lg:p-5">
              <header className="mb-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-full max-w-[170px] items-center justify-center">
                  <Image src="/stockmate-transparent.png" alt="StockMate logo" width={640} height={256} className="h-full w-full object-contain" priority />
                </div>
                <h2 className="text-[1.65rem] font-black tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1 text-[0.95rem] font-medium leading-6 text-slate-500">
                  Sign in to access your dashboard, inventory, and meal plans.
                </p>
              </header>

              {error && (
                <div className="mb-4 flex items-center gap-3 rounded-[1rem] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  <AlertCircle size={20} />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  name="username"
                  type="text"
                  placeholder="Username"
                  required
                  className="w-full rounded-[1rem] border border-slate-200/90 bg-slate-50/55 px-4 py-3 font-bold outline-none transition focus:border-emerald-500 focus:bg-white"
                  onChange={handleChange}
                  value={formData.username}
                  disabled={isRedirecting}
                />

                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      required
                      className="w-full rounded-[1rem] border border-slate-200/90 bg-slate-50/55 px-4 py-3 pr-12 font-bold outline-none transition focus:border-emerald-500 focus:bg-white"
                      onChange={handleChange}
                      value={formData.password}
                      disabled={isRedirecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={isRedirecting}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-end pr-2">
                    <Link href="/forgot-password" className="text-[10px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isRedirecting}
                  className="w-full rounded-[1rem] bg-[#2f6f4f] py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#285f44] disabled:opacity-70"
                >
                  {isLoading || isRedirecting ? <Loader2 className="mx-auto animate-spin" /> : "Login Account"}
                </button>
              </form>

              {isRedirecting && (
                <div className="mt-3 rounded-[1rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-[#2f6f4f]">
                  Login successful. Redirecting to dashboard...
                </div>
              )}

              <div className="mt-5 border-t border-slate-200/90 pt-4 text-center">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">No account yet?</p>
                <Link href="/register" className="inline-flex w-full items-center justify-center rounded-[1rem] border border-slate-200/90 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  Create New Account
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
