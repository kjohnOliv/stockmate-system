"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "staff" | "cook";

type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  status: string;
};

type AuthContextType = {
  user: User | null;
  login: (userData: any) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCook: boolean;
  isAdminOrCook: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const checkAuth = () => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && savedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser?.id) {
          parsedUser.role = parsedUser.role?.toLowerCase() as UserRole;
          setUser(parsedUser);
        }
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  };
  checkAuth();
}, []);

  const login = (userData: any) => {
    const normalizedUser = {
      ...userData,
      role: userData.role.toLowerCase() as UserRole
    };
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isCook = user?.role === "cook";
  const isAdminOrCook = isAdmin || isCook;

  return (
    <AuthContext.Provider value={{ 
      user, login, logout, isLoading, 
      isAdmin, isStaff, isCook, isAdminOrCook 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}