'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Hook that cleans up demo sessions when the tab closes.
 * Uses the Page Visibility API to detect tab close.
 */
export function useDemoCleanup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.isDemo) return;
    function onPageHide(e: PageTransitionEvent) {
      if (e.persisted) return;
      const t = localStorage.getItem('shareit_token');
      if (!t) return;
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/demo-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        keepalive: true,
      }).catch(() => {});
    }
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [user]);
}
