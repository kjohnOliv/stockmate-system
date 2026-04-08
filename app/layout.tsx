"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AppTopbar from "@/components/AppTopbar";
import { usePathname } from "next/navigation";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ApiClient, isPasswordChangeRequiredErrorMessage } from "@/lib/api";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

type AccountAlertUser = {
  status?: string;
  is_active?: boolean;
};

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingMealPlans, setPendingMealPlans] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [activePlanStatus, setActivePlanStatus] = useState("");

  const hideSidebarRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/pending-approval", "/"];
  const hideSidebar = hideSidebarRoutes.includes(pathname);

  const isPendingStatus = (status?: string, isActive?: boolean) => {
    const normalized = (status || "").toLowerCase().trim();
    if (normalized === "pending") return true;
    if (isActive === false && normalized !== "approved" && normalized !== "denied") return true;
    return false;
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      if (hideSidebar || !user) return;

      try {
        if (user.role === "admin") {
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
        } else {
          setPendingCount(0);
        }

        const stockRes = await ApiClient.get("/api/dashboard/overview");
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (stockData?.success) setLowStockCount(stockData.data?.lowStock ?? 0);
        }

        if (user.role !== "staff") {
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
        } else {
          setPendingMealPlans(0);
        }

        const activeRes = await ApiClient.get("/api/meal-plans/active");
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          const activePlan = activeData?.data || activeData;
          if (activePlan) {
            const status = activePlan.status || activePlan.status?.toString() || "published";
            setActivePlanStatus(status.toString().toUpperCase());
          } else {
            setActivePlanStatus("");
          }
        } else {
          setActivePlanStatus("");
        }
      } catch (err) {
        if (err instanceof Error && isPasswordChangeRequiredErrorMessage(err.message)) return;
        console.error("Layout Sync Error:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [hideSidebar, pathname, user]);

  return (
    <div className="flex min-h-screen">
      {!hideSidebar && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pendingCount={pendingCount}
          lowStockCount={lowStockCount}
        />
      )}
      <main className={cn("flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300", !hideSidebar && (isSidebarOpen ? "lg:pl-72" : "lg:pl-0"))}>
        {!hideSidebar && (
          <AppTopbar
            onOpenSidebar={() => setIsSidebarOpen((current) => !current)}
            pendingCount={pendingCount}
            pendingMealPlans={pendingMealPlans}
            lowStockCount={lowStockCount}
            activePlanStatus={activePlanStatus}
          />
        )}
        <div className={cn("flex-1 overflow-x-hidden", !hideSidebar ? "px-3 py-3 md:px-5 md:py-5 lg:px-6 lg:py-6" : "p-0")}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-[#f8f9fa] antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
