"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
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
  const { user, api } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace("/"); return; }
    if (!user.isAdmin) { router.replace("/files"); return; }
  }, [ready, user, router]);

  if (!ready || !user || !user.isAdmin) return null;

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
                  ? "bg-blue-600 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => router.push("/files")}
            className="w-full px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-left"
          >
            ← Back to files
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-6 py-4">
        <AdminPanel apiFetch={api} tab={tab} />
      </main>
      </div>
    </div>
  );
}
