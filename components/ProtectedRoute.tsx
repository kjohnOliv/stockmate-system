"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not logged in? Send to login
        router.push("/login");
      } else if (user.status === "pending") {
        // Logged in but pending? Send to pending page
        router.push("/pending-approval");
      } else if (user.is_active === false) {
        // Account deactivated? Force logout/login
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#6BCB3B]" size={48} />
      </div>
    );
  }

  // Only render children if user is logged in, approved, and active
  return user && user.status === "approved" && user.is_active ? <>{children}</> : null;
}
