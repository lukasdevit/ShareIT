'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { LandingPage } from '@/components/LandingPage';

export default function HomePage() {
  const { user } = useAuth();
  const { replace } = useRouter();

  useEffect(() => {
    if (user) replace('/files');
  }, [user, replace]);

  if (user) return null;

  return <LandingPage />;
}
