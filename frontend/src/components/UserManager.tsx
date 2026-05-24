"use client";

import { useState, useEffect } from "react";
import { formatSize } from "../lib/utils";

interface User {
  id: number;
  username: string;
  storage_limit: number;
  is_admin: number;
  used: number;
  file_count: number;
  created_at: string;
}

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export function UserManager({ apiFetch }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editStorage, setEditStorage] = useState("");
  const [editAdmin, setEditAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/users");
      if (r.ok) setUsers(await r.json());
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function openEdit(u: User) {
    setEditId(u.id);
    setEditStorage(String(u.storage_limit));
    setEditAdmin(u.is_admin === 1);
    setEditPassword("");
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const body: Record<string, unknown> = {};
    const limitNum = Number(editStorage);
    if (!isNaN(limitNum) && limitNum >= 0) body.storage_limit = limitNum;
    if (editAdmin !== (users.find((u) => u.id === editId)?.is_admin === 1)) body.is_admin = editAdmin;
    if (editPassword.trim()) body.new_password = editPassword.trim();

    if (Object.keys(body).length === 0) {
      setMessage({ type: "err", text: "No changes to save" });
      return;
    }

    try {
      const r = await apiFetch(`/admin/users/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage({ type: "ok", text: "User updated!" });
      setEditPassword("");
      await fetchUsers();
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    }
  }

  async function handleDelete(id: number) {
    try {
      const r = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDeleteConfirm(null);
      setEditId(null);
      await fetchUsers();
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    }
  }

  const totalUsed = users.reduce((sum, u) => sum + u.used, 0);
  const totalFiles = users.reduce((sum, u) => sum + u.file_count, 0);

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="card-title">🛡️ Admin Panel</h2>
        <button onClick={fetchUsers} className="btn-zinc">🔄 Refresh</button>
      </div>

      <div className="flex gap-4 text-sm text-zinc-400">
        <span>{users.length} user{users.length !== 1 ? "s" : ""}</span>
        <span>{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
        <span>{formatSize(totalUsed)} total</span>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {users.map((u) => {
            const usagePercent = u.storage_limit > 0 ? Math.min(100, (u.used / u.storage_limit) * 100) : 0;
            const isEditing = editId === u.id;

            return (
              <div
                key={u.id}
                className={`rounded-lg border p-3 transition-colors ${isEditing ? "border-blue-600 bg-zinc-800/50" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"}`}
              >
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-200">Editing: {u.username}</span>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-green">Save</button>
                        <button type="button" onClick={() => setEditId(null)} className="btn-zinc">Cancel</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Storage Limit (bytes)</label>
                        <input type="number" value={editStorage} onChange={(e) => setEditStorage(e.target.value)} className="input-sm" min="0" />
                        <span className="text-xs text-zinc-600">{formatSize(Number(editStorage) || 0)}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Admin</label>
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <input type="checkbox" checked={editAdmin} onChange={(e) => setEditAdmin(e.target.checked)}
                            className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500" />
                          <span className="text-xs text-zinc-300">Is admin</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">New Password</label>
                        <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="(leave blank)" className="input-sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {message && <p className={`text-xs ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>{message.text}</p>}
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-2 text-xs ml-auto">
                          <span className="text-red-400">Confirm delete?</span>
                          <button type="button" onClick={() => handleDelete(u.id)}
                            className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors">Yes</button>
                          <button type="button" onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-medium transition-colors">No</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirm(u.id)} className="btn-red ml-auto">🗑 Delete User</button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{u.username}</span>
                        {u.is_admin === 1 && <span className="badge-amber">ADMIN</span>}
                      </div>
                      <button onClick={() => openEdit(u)} className="btn-ghost">✏️ Edit</button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{formatSize(u.used)} / {formatSize(u.storage_limit)}</span>
                      <span>{u.file_count} files</span>
                    </div>
                    <StorageBar pct={usagePercent} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StorageBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{
        width: `${pct}%`,
        background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#3b82f6",
      }} />
    </div>
  );
}
