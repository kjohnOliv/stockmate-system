"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { Geist } from "next/font/google";
import { cn } from "../lib/utils";
import { Menu } from "lucide-react";
import axios from "axios";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notification States
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const hideSidebarRoutes = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/reset-password", 
    "/pending-approval",
    "/"
  ];
  
  const hideSidebar = hideSidebarRoutes.includes(pathname);

  // Sync Notification Data from Go Backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // 1. Get Pending Users
        const userRes = await axios.get("http://localhost:8080/auth/pending-count");
        if (userRes.data.success) setPendingCount(userRes.data.data);

        // 2. Get Low Stock Count
        const stockRes = await axios.get("http://localhost:8080/api/dashboard/overview");
        if (stockRes.data.success) setLowStockCount(stockRes.data.data.lowStock);
      } catch (err) {
        console.error("Layout Sync Error:", err);
      }
    };

    if (!hideSidebar) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [pathname, hideSidebar]);

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-[#f8f9fa] antialiased">
        <AuthProvider>
          <div className="flex min-h-screen">
            
            {/* Sidebar with Props */}
            {!hideSidebar && (
              <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                pendingCount={pendingCount}
                lowStockCount={lowStockCount}
              />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
              
              {/* Mobile Header (Hamburger Menu) */}
              {!hideSidebar && (
                <header className="lg:hidden flex items-center justify-between p-4 bg-[#FFF9C4] border-b border-gray-300 sticky top-0 z-40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full border border-green-700 p-1">
                        <img src="/logo.png" className="w-full h-full object-contain" alt="logo" />
                    </div>
                    <span className="font-black text-xs uppercase text-gray-800">StockMate</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="relative p-2 bg-white rounded-lg shadow-sm border border-gray-200 active:scale-95 transition-transform"
                  >
                    <Menu size={20} className="text-gray-700" />
                    
                    {/* Mobile Global Alert Badge (Shows if ANY alert exists) */}
                    {(pendingCount > 0 || lowStockCount > 0) && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white border border-white">
                        {pendingCount + lowStockCount}
                      </span>
                    )}
                  </button>
                </header>
              )}

              {/* Dynamic Page Padding */}
              <div className={cn(
                "flex-1 overflow-x-hidden",
                !hideSidebar ? 'p-4 md:p-8 lg:p-10' : 'p-0'
              )}>
                {children}
              </div>
            </main>

          </div>
        </AuthProvider>
      </body>
    </html>
  );
}