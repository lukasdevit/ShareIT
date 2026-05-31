'use client';

import { useAuth } from '@/features/auth/AuthProvider';
import { FilesPanel } from '@/components/FilesPanel';
import { useDemoCleanup } from '@/hooks/use-demo-cleanup';

export function FilesContent() {
  const { user } = useAuth();
  useDemoCleanup();

  if (!user) return null;
  return <FilesPanel />;
}
