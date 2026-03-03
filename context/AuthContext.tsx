"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type User = {
  id: number;
  username: string;
  role: "admin" | "staff" | "cook"; 
};

type AuthContextType = {
  user: User | null;
  login: (id: number, username: string, role: "admin" | "staff" | "cook") => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    
    // Safety check: Ensure savedUser isn't null or the literal string "undefined"
    if (savedUser && savedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && typeof parsedUser.id === 'number') {
          setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem("user"); // Clear the "bad" data
      }
    }
    setIsLoading(false);
  }, []);

  const login = (id: number, username: string, role: "admin" | "staff" | "cook") => {
    const newUser: User = { id, username, role };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}