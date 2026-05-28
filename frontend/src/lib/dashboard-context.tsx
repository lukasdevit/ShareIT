"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type DashboardPanel = "files" | "settings" | "admin";

interface DashboardCtx {
  panel: DashboardPanel;
  setPanel: (p: DashboardPanel) => void;
}

const Ctx = createContext<DashboardCtx>({
  panel: "files",
  setPanel: () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanelState] = useState<DashboardPanel>("files");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("shareit_panel");
    if (saved === "files" || saved === "settings" || saved === "admin") {
      setPanelState(saved);
    }
  }, []);

  const setPanel = useCallback((p: DashboardPanel) => {
    setPanelState(p);
    localStorage.setItem("shareit_panel", p);
  }, []);

  return <Ctx.Provider value={{ panel, setPanel }}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  return useContext(Ctx);
}
