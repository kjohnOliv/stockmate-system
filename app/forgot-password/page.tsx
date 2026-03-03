"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:8080/auth/forgot-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // 1. Validate response type to prevent "Unexpected end of JSON" errors
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        
        if (res.ok && data.token) {
          setMessage("Success! Verification complete.");
          // Small delay so the user can actually read the success message
          setTimeout(() => {
            router.push(`/reset-password?token=${data.token}`);
          }, 1500);
        } else {
          // Display the specific error message from the Go backend
          setMessage(data.error || "Failed to verify email. Please try again.");
        }
      } else {
        // 2. Fallback for non-JSON responses (like 404 or 500 plain text errors)
        const textError = await res.text();
        setMessage(textError || `Server error: ${res.status}`);
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      // 3. Network-level error handling
      setMessage("Connection error. Ensure the Go server is active on port 8080.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDE7] p-4">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-md border-4 border-[#F3EBC7] text-center">
        <h2 className="text-2xl font-black mb-4 text-[#2D3142]">Reset Password</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email to receive a secure reset token.
        </p>

        <form onSubmit={handleResetRequest} className="space-y-4 text-black">
          <div>
            <label className="block text-left font-bold mb-1 text-sm text-[#2D3142]">Email Address</label>
            <input
              type="email"
              placeholder="admin@stockmate.com"
              className="w-full p-4 rounded-2xl border-2 border-black outline-none focus:border-[#6BCB3B] transition-all bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-md transition-all active:scale-95 ${
              isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#6BCB3B] hover:bg-[#5bb331]"
            }`}
          >
            {isLoading ? "Verifying..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${
            message.includes("Success") 
              ? "bg-green-100 text-green-600 border border-green-200" 
              : "bg-red-100 text-red-500 border border-red-200"
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8">
          <Link href="/login" className="text-gray-400 font-bold hover:text-black transition-colors text-sm underline decoration-2 underline-offset-4">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}