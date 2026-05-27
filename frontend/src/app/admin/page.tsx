"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../lib/api";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { AdminPanel } from "../../components/AdminPanel";

type Tab = "users" | "database" | "storage" | "ssl" | "analytics" | "backups";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "users", label: "Users", icon: "👥" },
  { key: "database", label: "Database", icon: "🗄️" },
  { key: "storage", label: "Storage", icon: "💾" },
  { key: "ssl", label: "SSL", icon: "🔒" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "backups", label: "Backups", icon: "🗄️" },
];

export default function AdminRoute() {
  const { api } = useAuth();
  const { isReady, user } = useRequireAuth(true);
  const [tab, setTab] = useState<Tab>("users");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ⌘+\ or Ctrl+\ toggles sidebar collapse
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
      e.preventDefault();
      setCollapsed((c) => !c);
    }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isReady) return null;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-200 ease-in-out
          bg-zinc-950 border-r border-zinc-800
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-16" : "w-60"}`}
      >
        {/* Collapse toggle — floats on right edge, desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 items-center justify-center transition-colors z-10"
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘+\\)`}
        >
          <svg className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {/* Sidebar header */}
        <div className={`px-5 py-5 border-b border-zinc-800 ${collapsed ? "px-3 text-center" : ""}`}>
          {collapsed ? (
            <span className="text-lg">⚡</span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">ShareIT</span>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">Admin</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 truncate">{user.username}</p>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSidebarOpen(false); }}
              title={collapsed ? t.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-md text-sm transition-colors
                ${collapsed ? "justify-center px-0 py-2.5 text-base" : "px-3 py-2"}
                ${tab === t.key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
            >
              <span>{t.icon}</span>
              {!collapsed && <span>{t.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className={`px-5 py-4 border-t border-zinc-800 ${collapsed ? "px-2" : ""}`}>
          <a
            href="/files"
            className={`flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? "←" : "← Back to files"}
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold">Admin</span>
          <span className="text-xs text-zinc-500 ml-auto">{TABS.find((t) => t.key === tab)?.label}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-8 max-w-5xl">
          <AdminPanel apiFetch={api} tab={tab} />
        </div>
      </main>
    </div>
  );
}
