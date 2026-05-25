"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
import { AdminPanel } from "../../components/AdminPanel";

export default function AdminRoute() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for auth to resolve before checking
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
          <button
            onClick={() => router.push("/files")}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            ← Back to files
          </button>
        </div>
      </header>

      <div className="w-full max-w-2xl px-4 pb-16 space-y-6">
        <AdminPanel apiFetch={api} />
      </div>
    </div>
  );
}
