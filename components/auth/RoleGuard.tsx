"use client";

import { useAuth, UserRole } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (!hasAccess) {
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, hasAccess, router]);

  if (isLoading || !user || !hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3F4F6]">
        <div className="text-center p-10 bg-white border border-slate-200 shadow-2xl rounded-[32px]">
          <div className="relative w-16 h-16 mx-auto mb-6">
             <div className="absolute inset-0 border-4 border-slate-300 rounded-full animate-spin border-t-transparent"></div>
             <div className="absolute inset-2 border-4 border-[#76ba53] rounded-full animate-pulse"></div>
          </div>
          <p className="text-black font-black uppercase italic text-2xl">Verifying Access</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
