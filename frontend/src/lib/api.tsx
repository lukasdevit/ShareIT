"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserInfo } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  api: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("shareit_token");
    if (saved) setToken(saved);
  }, []);

  // Validate token and fetch user
  useEffect(() => {
    if (!token) { setUser(null); return; }
    let cancelled = false;
    apiRaw(token, "/auth/me").then(async (r) => {
      if (cancelled) return;
      if (r.ok) setUser((await r.json()).user);
      else { localStorage.removeItem("shareit_token"); setToken(null); }
    });
    return () => { cancelled = true; };
  }, [token]);

  const api = useCallback((path: string, options?: RequestInit) => {
    return apiRaw(token, path, options);
  }, [token]);

  async function login(username: string, password: string) {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setToken(d.token);
    setUser(d.user);
    localStorage.setItem("shareit_token", d.token);
  }

  async function register(username: string, password: string) {
    const r = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setToken(d.token);
    setUser(d.user);
    localStorage.setItem("shareit_token", d.token);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("shareit_token");
  }

  return (
    <AuthCtx.Provider value={{ token, user, login, register, logout, api }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function apiRaw(token: string | null, path: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
