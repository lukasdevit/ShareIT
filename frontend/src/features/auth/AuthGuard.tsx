'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * Central auth guard. Redirects to / if not authenticated,
 * or to / if authenticated but lacking admin role.
 *
 * Place in route group layouts for automatic protection.
 */
export function AuthGuard({ children, requireAdmin = false }: Props) {
  const { user } = useAuth();
  const { replace } = useRouter();

  useEffect(() => {
    if (!user) {
      replace('/');
      return;
    }
    if (requireAdmin && !user.isAdmin) {
      replace('/');
    }
  }, [user, replace, requireAdmin]);

  if (!user) return null;
  if (requireAdmin && !user.isAdmin) return null;

  return <>{children}</>;
}
