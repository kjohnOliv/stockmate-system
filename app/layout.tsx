"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationsProvider, useNotifications } from "@/context/NotificationsContext";
import Sidebar from "@/components/Sidebar";
import AppTopbar from "@/components/AppTopbar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ApiClient, isAccessDeniedError, isPasswordChangeRequiredErrorMessage } from "@/lib/api";

type AccountAlertUser = {
  status?: string;
  is_active?: boolean;
};

function resolveUserRole(user: { role?: string; requested_role?: string } | null | undefined) {
  const role = String(user?.role || "").toLowerCase().trim();
  const requestedRole = String(user?.requested_role || "").toLowerCase().trim();

  if (role === "admin" || role === "cook" || role === "staff") return role;
  if (requestedRole === "admin" || requestedRole === "cook" || requestedRole === "staff") return requestedRole;
  return role || requestedRole;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { refreshVersions } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingMealPlans, setPendingMealPlans] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const hideSidebarRoutes = ["/login", "/register", "/forgot-password", "/verify-otp", "/reset-password", "/pending-approval", "/", "/public-menu", "/food-menu"];
  const hideSidebar = hideSidebarRoutes.includes(pathname);

  const isPendingStatus = (status?: string, isActive?: boolean) => {
    const normalized = (status || "").toLowerCase().trim();
    if (normalized === "pending") return true;
    if (isActive === false && normalized !== "approved" && normalized !== "denied") return true;
    return false;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => {
      setIsDesktop(media.matches);
      if (media.matches) {
        setIsSidebarOpen(false);
      }
    };

    syncDesktopState();
    media.addEventListener("change", syncDesktopState);
    return () => media.removeEventListener("change", syncDesktopState);
  }, []);

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setIsSidebarCollapsed((current) => !current);
      return;
    }
    setIsSidebarOpen((current) => !current);
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      if (hideSidebar || !user) return;

      const effectiveRole = resolveUserRole(user);

      try {
        if (effectiveRole === "admin") {
          try {
            const accountsRes = await ApiClient.get("/api/users");
            if (accountsRes.ok) {
              const accountsData = await accountsRes.json();
              const accounts = Array.isArray(accountsData?.data)
                ? accountsData.data
                : Array.isArray(accountsData)
                ? accountsData
                : [];

              setPendingCount(accounts.filter((u: AccountAlertUser) => isPendingStatus(u.status, u.is_active)).length);
            }
          } catch (err) {
            if (!isAccessDeniedError(err)) throw err;
            setPendingCount(0);
          }
        } else {
          setPendingCount(0);
        }

        try {
          const stockRes = await ApiClient.get("/api/dashboard/overview");
          if (stockRes.ok) {
            const stockData = await stockRes.json();
            if (stockData?.success) setLowStockCount(stockData.data?.lowStock ?? 0);
          }
        } catch (err) {
          if (!isAccessDeniedError(err)) throw err;
          setLowStockCount(0);
        }

        if (effectiveRole !== "staff") {
          try {
            const mealPlansRes = await ApiClient.get("/api/meal-plans");
            if (mealPlansRes.ok) {
              const mealPlansData = await mealPlansRes.json();
              const plans = Array.isArray(mealPlansData?.data)
                ? mealPlansData.data
                : Array.isArray(mealPlansData)
                ? mealPlansData
                : [];

              const count = plans.filter((p: Record<string, unknown>) => {
                const status = String(p.status || "").toLowerCase();
                return status === "pending" || status === "awaiting" || status === "submitted";
              }).length;

              setPendingMealPlans(count);
            }
          } catch (err) {
            if (!isAccessDeniedError(err)) throw err;
            setPendingMealPlans(0);
          }
        } else {
          setPendingMealPlans(0);
        }
      } catch (err) {
        if (err instanceof Error && isPasswordChangeRequiredErrorMessage(err.message)) return;
        console.error("Layout Sync Error:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [hideSidebar, pathname, refreshVersions.dashboard, refreshVersions.inventory, refreshVersions.mealPlans, refreshVersions.users, user]);

  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggleCollapse={handleSidebarToggle}
          isCollapsed={isSidebarCollapsed}
          pendingCount={pendingCount}
          pendingMealPlans={pendingMealPlans}
          lowStockCount={lowStockCount}
        />
      )}
      <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300", !hideSidebar && (isSidebarCollapsed ? "lg:pl-28" : "lg:pl-72"))}>
        {!hideSidebar && (
          <AppTopbar
            onOpenSidebar={handleSidebarToggle}
            pendingCount={pendingCount}
            pendingMealPlans={pendingMealPlans}
            lowStockCount={lowStockCount}
          />
        )}
        <div
          className={cn(
            "hidden-scrollbar flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
            !hideSidebar ? "px-2.5 py-2.5 md:px-4 md:py-4 lg:px-5 lg:py-5" : "p-0"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="bg-[#f8f9fa] antialiased">
        <AuthProvider>
          <NotificationsProvider>
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
