'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Page = 'landing' | 'login' | 'files' | 'settings' | 'admin';

const Ctx = createContext<{
  page: Page;
  navigate: (to: Page) => void;
} | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('landing');
  const navigate = useCallback((to: Page) => { setPage(to); }, []);

  return <Ctx.Provider value={{ page, navigate }}>{children}</Ctx.Provider>;
}

export function useNavigation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
