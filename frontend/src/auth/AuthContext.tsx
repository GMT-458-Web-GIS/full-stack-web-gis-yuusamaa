// frontend/src/auth/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import type { AuthUser, Role } from "../api/client";
import { clearAuthUser, getAuthUser, setAuthUser } from "../api/client";
import { login as apiLogin, registerCitizen as apiRegisterCitizen } from "../api/auth";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthed: boolean;

  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string; user?: AuthUser }>;
  registerCitizen: (email: string, password: string) => Promise<{ ok: boolean; message?: string; user?: AuthUser }>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = getAuthUser();
  const [user, setUser] = useState<AuthUser | null>(initial);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);

  const isAuthed = !!user?.token;

  async function login(email: string, password: string) {
    const res = await apiLogin({ email, password });
    if (!res.ok) return { ok: false, message: res.error };

    setAuthUser(res.data);
    setUser(res.data);
    setToken(res.data.token);
    return { ok: true, user: res.data };
  }

  async function registerCitizen(email: string, password: string) {
    const res = await apiRegisterCitizen({ email, password });
    if (!res.ok) return { ok: false, message: res.error };

    setAuthUser(res.data);
    setUser(res.data);
    setToken(res.data.token);
    return { ok: true, user: res.data };
  }

  function logout() {
    clearAuthUser();
    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({ user, token, isAuthed, login, registerCitizen, logout }),
    [user, token, isAuthed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function hasRole(user: AuthUser | null, roles: Role[]) {
  if (!user) return false;
  return roles.includes(user.role);
}
