"use client";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { Geist } from "next/font/google";
import { cn } from "../lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // List of routes where the sidebar should not be visible
  const hideSidebarRoutes = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/reset-password", 
    "/pending-approval",
    "/"
  ];
  
  const hideSidebar = hideSidebarRoutes.includes(pathname);

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-[#f8f9fa] antialiased">
        <AuthProvider>
          <div className="flex min-h-screen">
            
            {/* Sidebar only renders on protected routes */}
            {!hideSidebar && <Sidebar />}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-x-hidden ${!hideSidebar ? 'p-0' : 'p-4 md:p-8'}`}>
              {children}
            </main>

          </div>
        </AuthProvider>
      </body>
    </html>
  );
}