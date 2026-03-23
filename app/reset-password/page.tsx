"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4">
      <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md text-center">
        <AlertCircle className="text-blue-500 mx-auto mb-4" size={48} />
        <h1 className="text-2xl font-black text-gray-900 mb-4">Password Reset</h1>
        <p className="text-gray-600 mb-6">
          Use the <strong>Forgot Password</strong> flow to reset your password. This page is not needed.
        </p>
        <Link
          href="/forgot-password"
          className="bg-[#6BCB3B] hover:bg-[#5ab52b] text-white font-black py-3 px-6 rounded-lg w-full block transition"
        >
          Go to Forgot Password
        </Link>
      </div>
    </div>
  );
}
