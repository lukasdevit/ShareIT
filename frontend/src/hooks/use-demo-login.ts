'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Hook for landing page demo login flow.
 */
export function useDemoLogin() {
  const { demoLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTryDemo() {
    setError(null);
    setLoading(true);
    try {
      await demoLogin();
    } catch {
      setError('Demo unavailable right now. Try signing in instead.');
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, handleTryDemo };
}
