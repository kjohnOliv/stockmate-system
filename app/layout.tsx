"use client";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /**
   * Sidebar Exclusion Logic:
   * Add any path here that should NOT show the sidebar (Auth pages).
   * Notice "/accounts" is NOT here, so it will show the sidebar.
   */
  const hideSidebarRoutes = ["/login", "/register", "/"];
  const shouldHideSidebar = hideSidebarRoutes.includes(pathname);

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <div className="flex">
            {/* Sidebar is only rendered if the current path is NOT in the hidden list */}
            {!shouldHideSidebar && <Sidebar />}
            
            <main className="flex-1 min-h-screen">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}