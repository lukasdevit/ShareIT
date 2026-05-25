"use client";

import { AuthProvider } from "../lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
