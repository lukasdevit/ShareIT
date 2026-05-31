'use client';

import { useAuth } from '@/features/auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';

function CloudIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
  );
}

interface NavButtonProps {
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  highlight?: boolean;
  onClick: () => void;
}

function NavButton({ active, icon, label, highlight, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? highlight
            ? 'bg-blue-600/20 text-blue-400'
            : 'bg-zinc-800 text-zinc-200'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function NavHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div className="flex items-center justify-between h-12 px-4 lg:px-6 max-w-screen-2xl mx-auto">
        <button
          onClick={() => router.push('/files')}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <img src="/logo.svg" alt="ShareIT" className="w-6 h-6" />
          ShareIT
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500 hidden sm:block mr-2">
            {user.username}
          </span>
          <NavButton active={pathname === '/files'} icon={<CloudIcon />} label="Upload" highlight onClick={() => router.push('/files')} />
          {user.isAdmin && <NavButton active={pathname === '/admin'} label="Admin" onClick={() => router.push('/admin')} />}
          <NavButton active={pathname === '/settings'} label="Settings" onClick={() => router.push('/settings')} />
          <button type="button" onClick={logout} className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
