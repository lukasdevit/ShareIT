'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';

export function NavHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div className="flex items-center justify-between h-12 px-4 lg:px-6 max-w-screen-2xl mx-auto">
        {/* Left */}
        <Link
          href="/files"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <img src="/logo.svg" alt="ShareIT" className="w-6 h-6" />
          ShareIT
        </Link>

        {/* Right */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500 hidden sm:block mr-2">
            {user.username}
          </span>
          <NavLink
            href="/files"
            active={pathname === '/files'}
            icon={<CloudIcon />}
            label="Upload"
            highlight
          />
          {user.isAdmin && (
            <NavLink
              href="/admin"
              active={pathname.startsWith('/admin')}
              label="Admin"
            />
          )}
          <NavLink
            href="/settings"
            active={pathname === '/settings'}
            label="Settings"
          />
          <button
            type="button"
            onClick={logout}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
  highlight,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-blue-600 text-white'
          : highlight
            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function CloudIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 40 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 24c-3.31 0-6-2.69-6-6s2.69-6 6-6c.8-2.8 3.5-4.8 6.6-4.8 2.9 0 5.4 1.7 6.4 4.2 1.8-.8 3.8-1.2 6-1.2 4.4 0 8 3.6 8 8s-3.6 8-8 8H8z" />
    </svg>
  );
}
