'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/AuthProvider';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const { replace, push } = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) replace('/files');
  }, [user, replace]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
      setUsername('');
      setPassword('');
      replace('/files');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100">
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
      <button
        type="button"
        onClick={() => push('/')}
        className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← Back to home
      </button>
    </div>
  );
}
