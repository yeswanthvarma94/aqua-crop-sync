
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { ensureDefaultAccount, getMembershipRole, getActiveAccountId, setActiveAccountId } from "@/lib/account";

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
  accountId: string | null;
  signInDev: (role?: UserRole) => Promise<void>;
  signInLocal: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isDevLoginEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "aqualedger.session";
const TEAM_KEY = "team.users";

const hashPassword = async (pw: string) => {
  if (!window.crypto?.subtle) return btoa(unescape(encodeURIComponent(pw)));
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accountId, setAccountId] = useState<string | null>(getActiveAccountId());

  const isDevLoginEnabled = import.meta.env.MODE === "development";

  useEffect(() => {
    // Restore session (web fallback)
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    // Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user;
      if (sUser) {
        const mapped: User = {
          id: sUser.id,
          name: (sUser.user_metadata?.name as string) || sUser.email || sUser.phone || "User",
          email: sUser.email || undefined,
          phone: (sUser as any).phone || undefined,
          role: "owner",
          status: "active",
        };
        setUser(mapped);

        // Defer backend calls to avoid deadlocks
        setTimeout(async () => {
          try {
            const accId = await ensureDefaultAccount(sUser.id);
            setAccountId(accId);
            setActiveAccountId(accId);
            const role = (await getMembershipRole(accId, sUser.id)) || "manager";
            setUser((prev) => (prev ? { ...prev, role } : prev));
          } catch (e) {
            console.error("Account bootstrap failed:", e);
          }
        }, 0);
      } else {
        // Don't force logout of dev/local user here; only clear if no local session persisted
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setUser(null);
          setAccountId(null);
        }
      }
    });

    // Initialize current session
    supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        const mapped: User = {
          id: sUser.id,
          name: (sUser.user_metadata?.name as string) || sUser.email || sUser.phone || "User",
          email: sUser.email || undefined,
          phone: (sUser as any).phone || undefined,
          role: "owner",
          status: "active",
        };
        setUser(mapped);
        // Defer follow-up
        setTimeout(async () => {
          try {
            const accId = await ensureDefaultAccount(sUser.id);
            setAccountId(accId);
            setActiveAccountId(accId);
            const role = (await getMembershipRole(accId, sUser.id)) || "manager";
            setUser((prev) => (prev ? { ...prev, role } : prev));
          } catch (e) {
            console.error("Account bootstrap failed:", e);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
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
    // Simulate a default account for dev
    const devAcc = getActiveAccountId() || crypto.randomUUID();
    setAccountId(devAcc);
    setActiveAccountId(devAcc);
  };

  const signInLocal = async (username: string, password: string) => {
    try {
      const raw = localStorage.getItem(TEAM_KEY);
      const team: Array<{ id: string; username: string; name: string; role: UserRole; passwordHash: string }> = raw ? JSON.parse(raw) : [];
      const u = team.find((t) => t.username.toLowerCase() === username.toLowerCase());
      if (!u) return { ok: false, message: "Invalid username or password" };
      const h = await hashPassword(password);
      if (h !== u.passwordHash) return { ok: false, message: "Invalid username or password" };
      const mapped: User = { id: u.id, name: u.name, role: u.role, status: "active" } as User;
      setUser(mapped);
      // Keep previous active account if any
      setAccountId(getActiveAccountId());
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  };

  const signOut = async () => {
    try { await supabase.auth.signOut({ scope: "global" } as any); } catch {}
    setUser(null);
    setAccountId(null);
  };

  const hasRole = (roles: UserRole[]) => (user ? roles.includes(user.role) : false);

  const value = useMemo(
    () => ({ user, accountId, signInDev, signInLocal, signOut, hasRole, isDevLoginEnabled }),
    [user, accountId, isDevLoginEnabled]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Make useAuth resilient: return safe defaults if the provider isn't mounted yet
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn("AuthProvider is not mounted; returning safe defaults from useAuth.");
    }
    return {
      user: null,
      accountId: null,
      signInDev: async () => {},
      signInLocal: async () => ({ ok: false, message: "AuthProvider not mounted" }),
      signOut: async () => {},
      hasRole: () => false,
      isDevLoginEnabled: import.meta.env.MODE === "development",
    };
  }
  return ctx;
};
