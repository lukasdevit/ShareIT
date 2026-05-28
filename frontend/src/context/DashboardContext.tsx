"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type DashboardPanel = "files" | "settings" | "admin";
export type FilesViewMode = "all" | "images" | "files";
export type AdminTab = "users" | "database" | "storage" | "ssl" | "analytics" | "backups";

interface DashboardState {
  activePanel: DashboardPanel;
  filesViewMode: FilesViewMode;
  adminTab: AdminTab;
}

const STORAGE_KEY = "shareit_dashboard";

function loadState(): DashboardState {
  if (typeof window === "undefined") return { activePanel: "files", filesViewMode: "all", adminTab: "users" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ activePanel: "files", filesViewMode: "all", adminTab: "users" }, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { activePanel: "files", filesViewMode: "all", adminTab: "users" };
}

function saveState(state: DashboardState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

interface ContextValue extends DashboardState {
  setActivePanel: (p: DashboardPanel) => void;
  setFilesViewMode: (m: FilesViewMode) => void;
  setAdminTab: (t: AdminTab) => void;
}

const DashboardCtx = createContext<ContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const setActivePanel = useCallback((p: DashboardPanel) => setState((s) => ({ ...s, activePanel: p })), []);
  const setFilesViewMode = useCallback((m: FilesViewMode) => setState((s) => ({ ...s, filesViewMode: m })), []);
  const setAdminTab = useCallback((t: AdminTab) => setState((s) => ({ ...s, adminTab: t })), []);

  return (
    <DashboardCtx.Provider value={{ ...state, setActivePanel, setFilesViewMode, setAdminTab }}>
      {children}
    </DashboardCtx.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardCtx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
