"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Define the base URL for the separated backend
  const API_BASE_URL = "http://localhost:8080";

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Your backend wraps the user in a 'data' field via sendJSON
    if (data.success && data.data) {
      const user = data.data; 
      login(user.id, user.username, user.role); 
      router.push("/dashboard");
    } else {
      alert(data.message || "Invalid credentials");
    }
  } catch (error) {
    console.error("Connection failed:", error);
    alert("Backend is unreachable. Please ensure the Go server is running on port 8080.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center border-4 border-[#F3EBC7]">
        <div className="mb-6">
          <img src="/logo.png" alt="StockMate Logo" className="w-20 mx-auto mb-2" />
          <h1 className="text-2xl font-black text-[#2D3142] tracking-tight">STOCKMATE</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Canteen Inventory System</p>
        </div>

        <form onSubmit={handleLogin} className="text-left space-y-4">
          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 rounded-2xl border-2 border-black outline-none bg-white focus:border-[#6BCB3B] transition-all font-bold"
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
              className="w-full p-4 rounded-2xl border-2 border-black outline-none bg-white focus:border-[#6BCB3B] transition-all font-bold"
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
              className={`w-full text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg transition-all active:scale-95 ${
                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#6BCB3B] hover:bg-[#5bb331] shadow-[#6BCB3B]/30"
              }`}
            >
              {isLoading ? "Authenticating..." : "Login"}
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