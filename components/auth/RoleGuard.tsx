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

  // We check access directly. Since we're using strings/enums, 
  // the check is lightning fast even without memoization.
  const userRole = user?.role as UserRole;
  const hasAccess = user && allowedRoles.includes(userRole);

  useEffect(() => {
    // Only redirect once the auth state is confirmed (not loading)
    if (!isLoading) {
      if (!user) {
        // No session? Go to login
        router.replace("/login");
      } else if (!hasAccess) {
        // Logged in but wrong role? Go to home/dashboard
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, hasAccess, router]);

  // While checking auth or redirecting, show the "Neobrutalist" Loader
  if (isLoading || !user || !hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3F4F6]">
        <div className="text-center p-10 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black border-solid mx-auto"></div>
          <p className="mt-6 text-black font-black uppercase tracking-tighter italic text-xl">
            Verifying Access...
          </p>
          <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">
            Stockmate Security Protocol
          </p>
        </div>
      </div>
    );
  }

  // If everything checks out, render the page content
  return <>{children}</>;
}