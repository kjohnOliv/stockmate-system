"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PublicMenuPage from "@/app/public-menu/page";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm"
          >
            Open Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-800 shadow-sm"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-2xl bg-[#76ba53] px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm"
            >
              Register
            </Link>
          </>
        )}
      </div>

      <PublicMenuPage />
    </div>
  );
}
