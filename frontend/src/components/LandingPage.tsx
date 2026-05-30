'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

const features = [
  {
    icon: '📤',
    title: 'Drag & drop uploads',
    desc: 'Upload single or multiple files. Images, documents, archives — up to 1 GB each. (configurable)',
  },
  {
    icon: '🔗',
    title: 'ShareX integration',
    desc: 'One-click setup. Send screenshots and files directly from your desktop.',
  },
  {
    icon: '🖼️',
    title: 'Image gallery + lightbox',
    desc: 'Browse images in a clean gallery with fullscreen view and keyboard navigation.',
  },
  {
    icon: '⚙️',
    title: 'Admin dashboard',
    desc: 'Manage users, browse the database, configure storage, run backups, and view analytics.',
  },
];

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { demoLogin } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function handleTryDemo() {
    setDemoError(null);
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch {
      setDemoError('Demo unavailable right now. Try signing in instead.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-4 pt-24 pb-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="" className="w-10 h-10" />
          <h1 className="text-3xl font-bold tracking-tight">ShareIT</h1>
        </div>

        <p className="text-lg text-zinc-400 max-w-xl mb-8">
          Self-hosted file sharing that stays simple. 
          Upload, organize, and share your files in a clean interface.
        </p>

        <div className="flex gap-3 mb-8">
          <button
            type="button"
            onClick={handleTryDemo}
            disabled={demoLoading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            {demoLoading ? 'Signing in…' : 'Try Demo'}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Sign In
          </button>
        </div>

        {demoError && <p className="text-sm text-red-400">{demoError}</p>}
      </section>

      {/* ── Features ── */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <h2 className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-10">
          Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                {f.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center pb-8 text-xs text-zinc-600">
        <a
          href="https://github.com/lukasdevit/ShareIT"
          className="hover:text-zinc-400 transition-colors"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
