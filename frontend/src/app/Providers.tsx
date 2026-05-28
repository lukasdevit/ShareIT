"use client";

import { AuthProvider } from "../lib/auth-context";
import { DashboardProvider } from "../context/DashboardContext";
import { NavHeader } from "../components/NavHeader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <NavHeader />
        {children}
      </DashboardProvider>
    </AuthProvider>
  );
}
