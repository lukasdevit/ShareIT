"use client";

import { useState, useEffect } from "react";
import { formatSize } from "../lib/utils";
import { useToast } from "./Toast";
import { MetricCard } from "./MetricCard";
import type { StorageInfo } from "../lib/types";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

export function SettingsPage({ apiFetch, onBack }: Props) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    apiFetch("/auth/storage")
      .then(async (r) => {
        if (r.ok) setStorage(await r.json());
      })
      .finally(() => setStorageLoading(false));
  }, [apiFetch]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast("Password changed successfully", "ok");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  async function downloadShareXConfig() {
    const r = await apiFetch("/sharex/config");
    const b = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "ShareIT.sxcu";
    a.click();
  }

  const usagePercent = storage ? Math.min(100, (storage.used / storage.limit) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account, storage, and integrations.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Storage Used" value={storage ? formatSize(storage.used) : "—"} />
        <MetricCard label="Storage Limit" value={storage ? formatSize(storage.limit) : "—"} />
        <MetricCard
          label="Usage"
          value={storage ? `${usagePercent.toFixed(0)}%` : "—"}
          sub={usagePercent > 90 ? "⚠️ Almost full" : usagePercent > 70 ? "Running low" : undefined}
        />
      </div>

      {/* Storage bar */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">Storage Usage</h2>
        {storageLoading ? (
          <div className="h-3 bg-zinc-800 rounded-full animate-pulse-subtle" />
        ) : storage ? (
          <div className="space-y-3">
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent > 90 ? "#ef4444" : usagePercent > 70 ? "#f59e0b" : "#3b82f6",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{formatSize(storage.used)} used</span>
              <span>{formatSize(storage.limit)} total</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Failed to load storage info</p>
        )}
      </section>

      {/* ShareX */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">ShareX Integration</h2>
        <p className="text-sm text-zinc-400">
          Download your personalized ShareX config file. Import it into ShareX under
          Destinations → Custom uploader settings.
        </p>
        <button
          onClick={downloadShareXConfig}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          ⬇ Download ShareX Config
        </button>
      </section>

      {/* Change Password */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
          >
            Update Password
          </button>
        </form>
      </section>
    </div>
  );
}
