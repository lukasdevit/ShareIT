"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { useDashboard } from "../context/DashboardContext";
import { LandingPage } from "../components/LandingPage";
import { LoginForm } from "../components/LoginForm";
import { FilesPanel } from "../components/FilesPanel";
import { SettingsPage } from "../components/SettingsPage";
import { ToastProvider } from "../components/Toast";
import { AdminPanel } from "../components/AdminPanel";

export default function HomePage() {
  const { user, login, register, demoLogin, api } = useAuth();
  const { activePanel } = useDashboard();

  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Best-effort cleanup of demo session on tab close
  useEffect(() => {
    if (!user?.isDemo) return;
    function onPageHide(e: PageTransitionEvent) {
      if (e.persisted) return;
      const t = localStorage.getItem("shareit_token");
      if (!t) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
      fetch(`${apiUrl}/auth/demo-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        keepalive: true,
      }).catch(() => {});
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [user]);

  // ── Unauthenticated ──
  if (!user) {
    if (showLogin) {
      return (
        <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100">
          <LoginForm
            mode={mode} username={username} password={password} error={error}
            onModeChange={setMode} onUsernameChange={setUsername}
            onPasswordChange={setPassword} onSubmit={async (e) => {
              e.preventDefault(); setError(null);
              try {
                if (mode === "login") await login(username, password);
                else await register(username, password);
                setUsername(""); setPassword("");
              } catch (err) { setError((err as Error).message); }
            }}
          />
          <button
            type="button"
            onClick={() => { setShowLogin(false); setError(null); }}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to home
          </button>
        </div>
      );
    }

    return (
      <LandingPage
        onTryDemo={async () => {
          setDemoError(null); setDemoLoading(true);
          try { await demoLogin(); }
          catch { setDemoError("Demo unavailable right now. Try signing in instead."); }
          finally { setDemoLoading(false); }
        }}
        onSignIn={() => setShowLogin(true)}
        demoLoading={demoLoading}
        demoError={demoError}
      />
    );
  }

  // ── Authenticated dashboard (no route change — URL stays at /) ──
  switch (activePanel) {
    case "settings":
      return (
        <ToastProvider>
          <div className="max-w-2xl mx-auto p-6 lg:p-8">
            <SettingsPage apiFetch={api} onBack={() => {}} />
          </div>
        </ToastProvider>
      );
    case "admin":
      return <AdminDashboard />;
    default:
      return <FilesPanel />;
  }
}

/** Inline admin dashboard — renders with persisted tab from context */
function AdminDashboard() {
  const { user, api } = useAuth();
  const { adminTab, setAdminTab } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const TABS = [
    { key: "users", label: "Users", icon: "👥" },
    { key: "database", label: "Database", icon: "🗄️" },
    { key: "storage", label: "Storage", icon: "💾" },
    { key: "ssl", label: "SSL", icon: "🔒" },
    { key: "analytics", label: "Analytics", icon: "📊" },
    { key: "backups", label: "Backups", icon: "🗄️" },
  ] as const;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-200 bg-zinc-950 border-r border-zinc-800 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "w-16" : "w-60"}`}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 items-center justify-center transition-colors z-10"
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘+\\)`}
        >
          <svg className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={`px-5 py-5 border-b border-zinc-800 ${collapsed ? "px-3 text-center" : ""}`}>
          {collapsed ? (
            <span className="text-lg">⚡</span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">ShareIT</span>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">Admin</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 truncate">{user?.username}</p>
            </>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => { setAdminTab(t.key); setSidebarOpen(false); }}
              title={collapsed ? t.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-md text-sm transition-colors ${collapsed ? "justify-center px-0 py-2.5 text-base" : "px-3 py-2"} ${adminTab === t.key ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
            >
              <span>{t.icon}</span>
              {!collapsed && <span>{t.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold">Admin</span>
          <span className="text-xs text-zinc-500 ml-auto">{TABS.find((t) => t.key === adminTab)?.label}</span>
        </div>
        <div className="flex-1 p-6 lg:p-8 max-w-5xl">
          <AdminPanel apiFetch={api} tab={adminTab} />
        </div>
      </main>
    </div>
  );
}
