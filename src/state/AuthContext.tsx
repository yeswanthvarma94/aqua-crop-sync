import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type UserRole = "owner" | "manager" | "partner";
export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
}

interface AuthContextValue {
  user: User | null;
  signInDev: (role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isDevLoginEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "aqualedger.session";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const isDevLoginEnabled = import.meta.env.MODE === "development";

  useEffect(() => {
    // Restore session (web fallback)
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    // Persist session (web fallback); native secure storage will be wired post-Capacitor sync
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [user]);

  const signInDev = async (role: UserRole = "owner") => {
    if (!isDevLoginEnabled) return;
    const devUser: User = {
      id: crypto.randomUUID(),
      name: "Dev Tester",
      email: "dev@example.com",
      role,
      status: "active",
    };
    setUser(devUser);
  };

  const signOut = async () => {
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => (user ? roles.includes(user.role) : false);

  const value = useMemo(
    () => ({ user, signInDev, signOut, hasRole, isDevLoginEnabled }),
    [user, isDevLoginEnabled]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
