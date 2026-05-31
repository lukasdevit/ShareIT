'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type Page = 'landing' | 'login' | 'files' | 'settings' | 'admin';

const STORAGE_KEY = 'shareit-page';

function readPage(): Page {
  if (typeof window === 'undefined') return 'landing';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'files' || stored === 'settings' || stored === 'admin') return stored;
  return 'landing';
}

const Ctx = createContext<{
  page: Page;
  navigate: (to: Page) => void;
} | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(readPage);

  const navigate = useCallback((to: Page) => {
    setPage(to);
    localStorage.setItem(STORAGE_KEY, to);
  }, []);

  // Clear stored page on unmount if landing/login (don't persist auth-only pages)
  useEffect(() => {
    return () => {
      if (page === 'landing' || page === 'login') {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
  }, [page]);

  return <Ctx.Provider value={{ page, navigate }}>{children}</Ctx.Provider>;
}

export function useNavigation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
