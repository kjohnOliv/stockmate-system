"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'cook' | 'staff' | 'user';

export type User = {
  id: number; // Changed to number to match PostgreSQL Serial
  username: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  role: UserRole;
  requested_role?: string;
  status: string;
  is_active: boolean;
  must_change_password?: boolean;
  contact_number?: string;
  token?: string; // JWT token for API authentication
};

type AuthContextType = {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isCook: boolean;
  isStaff: boolean;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on mount
    const savedUser = localStorage.getItem('stockmate_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        
        // Simple session validation - check if user data is complete
        if (parsedUser.id && parsedUser.email) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUser({
            ...parsedUser,
            must_change_password: Boolean(parsedUser.must_change_password),
          });
        } else {
          // Invalid user data, clear storage
          localStorage.removeItem('stockmate_user');
        }
      } catch (err) {
        console.error("Failed to parse saved user", err);
        localStorage.removeItem('stockmate_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    // Sanitize user data - only store necessary fields
    const sanitizedUser: User = {
      id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      first_name: userData.first_name,
      middle_name: userData.middle_name,
      last_name: userData.last_name,
      email: userData.email,
      role: userData.role,
      requested_role: userData.requested_role,
      status: userData.status,
      is_active: userData.is_active,
      must_change_password: Boolean(userData.must_change_password),
      contact_number: userData.contact_number,
      token: userData.token, // Store token if provided
    };
    
    setUser(sanitizedUser);
    localStorage.setItem('stockmate_user', JSON.stringify(sanitizedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stockmate_user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      login(updatedUser);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCook = user?.role === 'cook';
  const isStaff = user?.role === 'staff';

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin, isCook, isStaff, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
