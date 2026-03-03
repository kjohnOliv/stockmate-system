"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token"); 

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus("Invalid or missing reset token.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setStatus("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8080/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: token, 
          newPassword: newPassword // FIXED: Matches your Go struct `json:"newPassword"`
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        alert("Password updated successfully!");
        router.push("/login");
      } else {
        // Displays error message from backend (e.g., "Token invalid or expired")
        setStatus(data.message || data.error || "Failed to reset password.");
      }
    } catch (err) {
      setStatus("Error connecting to server. Is your Go backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-md border-4 border-[#F3EBC7] text-center text-black">
      <h2 className="text-2xl font-black mb-4 text-[#2D3142]">Set New Password</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your new secure password below.</p>
      
      <form onSubmit={handleReset} className="space-y-4">
        <input
          type="password"
          placeholder="New Password"
          className="w-full p-4 rounded-2xl border-2 border-black outline-none focus:border-[#6BCB3B] transition-all bg-white"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full p-4 rounded-2xl border-2 border-black outline-none focus:border-[#6BCB3B] transition-all bg-white"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !token}
          className={`w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${
            isLoading || !token ? "bg-gray-400 cursor-not-allowed" : "bg-[#6BCB3B] hover:bg-green-600"
          }`}
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {status && (
        <p className={`mt-4 text-sm font-bold ${status.includes("successfully") ? "text-green-500" : "text-red-500"}`}>
          {status}
        </p>
      )}

      {!token && (
        <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
          No token found in URL. Please use the link sent to your email.
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDE7] p-4">
      <Suspense fallback={<div className="text-black font-bold italic">Loading secure session...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}