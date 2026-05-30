'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNavigation } from '@/hooks/useNavigation';
import { LandingPage } from '@/components/LandingPage';
import { LoginForm } from '@/features/auth/LoginForm';
import { FilesContent } from '@/features/files/FilesContent';
import { SettingsContent } from '@/features/settings/SettingsContent';
import { AdminContent } from '@/features/admin/AdminContent';

export default function AppShell() {
  const { user, login, register } = useAuth();
  const { page, navigate } = useNavigation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-navigate logged-in users to files
  useEffect(() => {
    if (user && (page === 'landing' || page === 'login')) navigate('files');
  }, [user, page, navigate]);

  if (!user) {
    if (page !== 'login') {
      return <LandingPage onLogin={() => navigate('login')} />;
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      try {
        if (mode === 'login') await login(username, password);
        else await register(username, password);
        setUsername('');
        setPassword('');
      } catch (err) {
        setError((err as Error).message);
      }
    }

    return (
      <LoginForm
        mode={mode}
        username={username}
        password={password}
        error={error}
        onModeChange={setMode}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
    );
  }

  // Authenticated pages
  switch (page) {
    case 'settings':
      return (
        <div className="min-h-0 flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
          <SettingsContent />
        </div>
      );
    case 'admin':
      if (!user?.isAdmin) { navigate('files'); return null; }
      return (
        <div className="min-h-0 flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
          <AdminContent />
        </div>
      );
    default:
      return (
        <div className="min-h-0 flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
          <FilesContent />
        </div>
      );
  }
}
