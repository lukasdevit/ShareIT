'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { SettingsPage } from '@/components/SettingsPage';
import { ToastProvider } from '@/components/ui/Toast';

export function SettingsContent() {
  const { user, api } = useAuth();
  const { push } = useRouter();

  if (!user) return null;

  return (
    <ToastProvider>
      <div className="max-w-2xl mx-auto p-6 lg:p-8">
        <SettingsPage apiFetch={api} onBack={() => push('/files')} />
      </div>
    </ToastProvider>
  );
}
