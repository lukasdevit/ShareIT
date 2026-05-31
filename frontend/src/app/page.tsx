'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { LandingPage } from '@/components/LandingPage';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/files');
  }, [user, router]);

  if (loading) return null;
  if (user) return null;

  return <LandingPage onLogin={() => router.push('/login')} />;
}
