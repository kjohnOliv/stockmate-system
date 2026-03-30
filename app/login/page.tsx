"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
        // This will display "INVALID EMAIL OR USER NOT FOUND" from your backend
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

      // Validate account status before proceeding
      if (!userData.is_active) throw new Error("ACCOUNT DEACTIVATED.");
      
      if (userData.status !== "approved") {
        router.push("/pending-approval");
        return;
      }

      // Map API response to the AuthContext User type
      login({
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        is_active: userData.is_active,
        token: authToken,
      });

      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md">
        
        <header className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 bg-[#6BCB3B] rounded-full border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
             <Image
                src="/logo.png"
                alt="Logo"
                width={96}
                height={96}
                className="w-full h-full object-cover"
             />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">STOCKMATE</h1>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-xs uppercase">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            name="email" 
            type="email" 
            placeholder="EMAIL ADDRESS" 
            required 
            className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
            onChange={handleChange} 
          />
          
          <div className="space-y-2">
            <input 
              name="password" 
              type="password" 
              placeholder="PASSWORD" 
              required 
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#6BCB3B]"
              onChange={handleChange} 
            />
            <div className="flex justify-end pr-2">
              <Link 
                href="/forgot-password" 
                className="text-[10px] font-black uppercase text-gray-400 hover:text-black transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#6BCB3B] text-white py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-green-600 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Login Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-3">No account yet?</p>
          <Link 
            href="/register" 
            className="inline-block w-full py-3 rounded-2xl border border-slate-200 bg-white font-black uppercase text-xs shadow-sm hover:bg-slate-50 transition-all"
          >
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  );
}
