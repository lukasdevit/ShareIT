'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Registers demo session for server-side cleanup.
 * Cleanup is handled by the scheduled job (every 30 min, demos older than 1 hour).
 *
 * We deliberately do NOT clean up on pagehide/beforeunload because those
 * events also fire on page refresh — which would delete the demo user
 * before the refreshed page finishes loading, breaking auth + storage display.
 */
export function useDemoCleanup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.isDemo) return;
    // No-op: server-side scheduled cleanup handles stale demos.
    // The pagehide approach was removed because it fires on refresh
    // and deletes the demo user mid-reload.
  }, [user]);
}
