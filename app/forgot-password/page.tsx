"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await fetch("http://localhost:8080/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setStep(2);
      setMessage("Success! Code sent to your email.");
    } else {
      setMessage("Email not found.");
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    const res = await fetch("http://localhost:8080/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) {
      setStep(3);
      setMessage("Code verified. Enter your new password.");
    } else {
      setMessage("Invalid code.");
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage("Passwords do not match!");
      return;
    }
    setIsLoading(true);
    const res = await fetch("http://localhost:8080/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ email, password: passwords.new }),
    });
    if (res.ok) {
      setMessage("Success! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setMessage("Failed to update password.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDE7] p-4 font-sans text-black">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-md border-4 border-[#F3EBC7]">
        <h2 className="text-2xl font-black mb-4 text-[#2D3142] text-center">
          {step === 1 && "Forgot Password"}
          {step === 2 && "Enter OTP Code"}
          {step === 3 && "Reset Password"}
        </h2>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 rounded-2xl border-2 border-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="w-full py-4 bg-[#6BCB3B] text-white rounded-2xl font-bold">
              {isLoading ? "Sending..." : "Send Code"}
            </button>
          </form>
        )}

        {/* Step 2: OTP Input */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              className="w-full p-4 rounded-2xl border-2 border-black text-center tracking-[1em] font-bold"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={handleVerifyOTP} className="w-full py-4 bg-[#6BCB3B] text-white rounded-2xl font-bold">
              {isLoading ? "Verifying..." : "Validate Code"}
            </button>
          </div>
        )}

        {/* Step 3: Password Input */}
        {step === 3 && (
          <div className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              className="w-full p-4 rounded-2xl border-2 border-black"
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-4 rounded-2xl border-2 border-black"
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
            <button onClick={handleChangePassword} className="w-full py-4 bg-[#6BCB3B] text-white rounded-2xl font-bold">
              {isLoading ? "Updating..." : "Change Password"}
            </button>
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 rounded-xl text-center text-sm font-bold bg-gray-100">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}