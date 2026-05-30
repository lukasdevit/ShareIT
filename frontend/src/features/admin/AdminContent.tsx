'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/DashboardProvider';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ADMIN_TABS } from '@/config/constants';
import type { AdminTab } from '@/config/constants';

export function AdminContent() {
  const { user, api } = useAuth();
  const { adminTab, setAdminTab } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <AdminSidebar
        username={user.username}
        activeTab={adminTab}
        collapsed={collapsed}
        mobileOpen={sidebarOpen}
        onTabChange={(tab) => setAdminTab(tab)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold">Admin</span>
          <span className="text-xs text-zinc-500 ml-auto">
            {ADMIN_TABS.find((t) => t.key === adminTab)?.label}
          </span>
        </div>
        <div className="flex-1 p-6 lg:p-8 max-w-5xl">
          <AdminPanel apiFetch={api} tab={adminTab} />
        </div>
      </main>
    </div>
  );
}
