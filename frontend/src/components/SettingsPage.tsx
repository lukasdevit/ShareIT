"use client";

import { useState, useEffect } from "react";
import { formatSize } from "../lib/utils";
import type { StorageInfo, UserInfo } from "../lib/types";
import { AdminPanel } from "./AdminPanel";

interface Props {
  token: string;
  user: UserInfo;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

export function SettingsPage({ token: _token, user, apiFetch, onBack }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    apiFetch("/auth/storage")
      .then(async (r) => {
        if (r.ok) setStorage(await r.json());
      })
      .finally(() => setStorageLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    try {
      const r = await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPwMessage({ type: "ok", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwMessage({ type: "err", text: (err as Error).message });
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
    <div className="w-full max-w-xl mx-auto px-4 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        ← Back to files
      </button>

      {/* Storage */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Storage</h2>
        {storageLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : storage ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{formatSize(storage.used)} used</span>
              <span className="text-zinc-500">of {formatSize(storage.limit)}</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent > 90 ? "#ef4444" : usagePercent > 70 ? "#f59e0b" : "#3b82f6",
                }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              {usagePercent > 90
                ? "⚠️ Almost full — delete some files to free space"
                : `${(100 - usagePercent).toFixed(0)}% free`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Failed to load storage info</p>
        )}
      </section>

      {/* ShareX Config */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold">ShareX Integration</h2>
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
        <h2 className="text-lg font-semibold">Change Password</h2>
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
          {pwMessage && (
            <p
              className={`text-sm ${pwMessage.type === "ok" ? "text-green-400" : "text-red-400"}`}
            >
              {pwMessage.text}
            </p>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
          >
            Update Password
          </button>
        </form>
      </section>

      {/* Admin Panel */}
      {user.isAdmin && <AdminPanel apiFetch={apiFetch} />}
    </div>
  );
}
