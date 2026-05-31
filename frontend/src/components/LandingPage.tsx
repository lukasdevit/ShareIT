'use client';

import { useDemoLogin } from '@/hooks/use-demo-login';
import { useGlowEffect } from '@/hooks/use-glow-effect';
import type { ReactNode } from 'react';

const features = [
  {
    icon: '📤',
    title: 'Drag & drop uploads',
    desc: 'Upload single or multiple files. Images, documents, archives — up to 1 GB each. (configurable)',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconBg: 'bg-blue-500/15 text-blue-400',
    glow: 'glow-blue',
  },
  {
    icon: '🔗',
    title: 'ShareX integration',
    desc: 'One-click setup. Send screenshots and files directly from your desktop.',
    gradient: 'from-violet-500/20 to-purple-500/10',
    iconBg: 'bg-violet-500/15 text-violet-400',
    glow: 'glow-violet',
  },
  {
    icon: '🖼️',
    title: 'Image gallery + lightbox',
    desc: 'Browse images in a clean gallery with fullscreen view and keyboard navigation.',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-500/15 text-amber-400',
    glow: 'glow-amber',
  },
  {
    icon: '⚙️',
    title: 'Admin dashboard',
    desc: 'Manage users, browse the database, configure storage, run backups, and view analytics.',
    gradient: 'from-emerald-500/20 to-green-500/10',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    glow: 'glow-emerald',
  },
];

function GlowCard({ glow, gradient, children }: { glow: string; gradient: string; children: ReactNode }) {
  const { ref, onMouseMove, onMouseLeave } = useGlowEffect<HTMLDivElement>();
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`glow-hover ${glow} group relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-zinc-700 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative">{children}</div>
    </div>
  );
}

function AppMockup() {
  return (
    <div className="relative w-full max-w-3xl mx-auto mt-12 mb-4 group/mockup">
      {/* Glow effect behind the mockup */}
      <div className="absolute -inset-8 bg-linear-to-b from-blue-500/8 via-blue-500/4 to-transparent rounded-3xl blur-2xl transition-opacity duration-500 opacity-60 group-hover/mockup:opacity-100" />

      {/* Browser frame */}
      <div className="relative rounded-xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50 transition-shadow duration-500 group-hover/mockup:shadow-blue-500/5">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500 font-mono">
              shareit.example.com
            </div>
          </div>
        </div>

        {/* Screenshot */}
        <img
          src="/landing-screenshot.png"
          alt="ShareIT application interface showing file uploads, image gallery, and file management"
          className="w-full h-auto block rounded-b-xl"
          width={1912}
          height={914}
          loading="eager"
        />
      </div>
    </div>
  );
}

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { loading: demoLoading, error: demoError, handleTryDemo } = useDemoLogin();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-4 pt-20 sm:pt-28 pb-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="" className="w-10 h-10" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">ShareIT</h1>
        </div>

        <p className="text-base sm:text-lg text-zinc-400 max-w-xl mb-8 leading-relaxed">
          Self-hosted file sharing that stays simple.{' '}
          Upload, organize, and share your files in a clean interface.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={handleTryDemo}
            disabled={demoLoading}
            className="pressable px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
          >
            {demoLoading ? 'Signing in…' : '✦ Try Demo'}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="pressable px-6 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100"
          >
            Sign In →
          </button>
        </div>

        {demoError && <p className="text-sm text-red-400 mb-4">{demoError}</p>}

        {/* App mockup illustration */}
        <AppMockup />
      </section>

      {/* ── Features ── */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-24">
        <h2 className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-10">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <GlowCard key={f.title} glow={f.glow} gradient={f.gradient}>
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${f.iconBg} text-lg mb-3`}>
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">
                {f.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </GlowCard>
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
