"use client";

import { useState } from "react";
import { useAuth } from "../../lib/api";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { AdminPanel } from "../../components/AdminPanel";

type Tab = "users" | "files" | "storage" | "ssl" | "analytics";

const TABS: { key: Tab; label: string }[] = [
  { key: "users", label: "👥 Users" },
  { key: "files", label: "🗄️ Files DB" },
  { key: "storage", label: "💾 Storage" },
  { key: "ssl", label: "🔒 SSL" },
  { key: "analytics", label: "📊 Analytics" },
];

export default function AdminRoute() {
  const { api } = useAuth();
  const { isReady } = useRequireAuth(true);
  const [tab, setTab] = useState<Tab>("users");

  if (!isReady) return null;

  return (
    <div className="flex justify-center bg-zinc-950 text-zinc-100 font-sans py-8">
      <div className="flex w-full max-w-4xl">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
          <div className="px-4 py-4">
            <h1 className="text-lg font-semibold tracking-tight">🛡️ Admin</h1>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  tab === t.key
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6">
          <AdminPanel apiFetch={api} tab={tab} />
        </main>
      </div>
    </div>
  );
}
