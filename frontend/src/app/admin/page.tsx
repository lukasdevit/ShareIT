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
  { key: "analytics", label: "📊 Analytics" }
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
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="w-full max-w-2xl pt-12 pb-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">🛡️ Admin Panel</h1>
            <p className="text-zinc-500 text-sm mt-1">User management, database editor & table browser</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/files")}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors whitespace-nowrap"
            >
              ← Back
            </button>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as Tab)}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer w-40"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2371717a' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "1.75rem" }}
            >
              {TABS.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="w-full max-w-2xl px-4 pb-16">
        <AdminPanel apiFetch={api} tab={tab} />
      </div>
    </div>
  );
}
