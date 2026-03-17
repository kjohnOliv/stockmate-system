"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(""); 
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(""); 

    try {
      // Use the environment variable for the API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format from server.");
      }

      const data = await response.json();

      // Handle the Success state from your Go APIResponse struct
      if (data.success && data.data) {
        const user = data.data; 

        // Check if account is active or pending
        if (user.status === "pending") {
          router.push("/pending-approval");
          return;
        }

        if (user.is_active === false) {
          setError("This account has been deactivated. Please contact an admin.");
          return;
        }

        // Success: Log in using context and redirect
        login(user); 
        router.push("/dashboard");
      } else {
        // Handle custom error message from backend
        setError(data.message || "Invalid email or password.");
      }
    } catch (err: any) {
      setError("Backend is unreachable. Ensure the Go server is running on port 8080.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center border-4 border-[#F3EBC7] animate-in fade-in zoom-in duration-300">
        <div className="mb-6">
          <img src="/logo.png" alt="StockMate Logo" className="w-20 mx-auto mb-2" />
          <h1 className="text-2xl font-black text-[#2D3142] tracking-tight uppercase">STOCKMATE</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center">Canteen Inventory System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-[20px] flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight text-left leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="text-left space-y-4">
          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={`w-full p-4 rounded-2xl border-2 outline-none bg-white transition-all font-bold ${
                error ? 'border-red-200 focus:border-red-400' : 'border-black focus:border-[#6BCB3B]'
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className={`w-full p-4 rounded-2xl border-2 outline-none bg-white transition-all font-bold ${
                error ? 'border-red-200 focus:border-red-400' : 'border-black focus:border-[#6BCB3B]'
              }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#6BCB3B] hover:bg-[#5bb331] shadow-[#6BCB3B]/30"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : "Login"}
            </button>

            <Link href="/register" className="w-full">
              <button 
                type="button"
                className="w-full border-2 border-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black hover:text-white transition-all active:scale-95"
              >
                Sign Up
              </button>
            </Link>
          </div>
        </form>

        <div className="mt-8">
          <Link 
            href="/forgot-password" 
            className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-black hover:underline transition-all"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}