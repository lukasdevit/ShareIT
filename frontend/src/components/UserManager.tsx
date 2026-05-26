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
  const [editStorage, setEditStorage] = useState(0);
  const [editAdmin, setEditAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState(0);

  async function fetchUsers(p = 1, s = "") {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25" });
      if (s) params.set("search", s);
      const r = await apiFetch(`/admin/users?${params.toString()}`);
      if (r.ok) {
        const d = await r.json();
        setUsers(d.users);
        setPage(d.page);
        setTotalPages(d.totalPages);
        setTotal(d.total);
      }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(1, search); }, []);

  function openEdit(u: User) {
    setEditId(u.id);
    setEditStorage(
      u.storage_limit > 0 ? u.storage_limit / 1024 / 1024 / 1024 : 0
    );
    setEditAdmin(u.is_admin === 1);
    setEditPassword("");
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const body: Record<string, unknown> = {};
    const limitNum = Number(editStorage);
    if (editStorage >=0) {
      body.storage_limit = editStorage > 0 ? Math.round(limitNum * 1024 * 1024 * 1024) : 0;
    }
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
      await fetchUsers(page, search);
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
      await fetchUsers(page, search);
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setMessage({ type: "err", text: "Username and password required" });
      return;
    }
    try {
      const body: Record<string, unknown> = { username: newUsername.trim(), password: newPassword };
      if (newIsAdmin) body.is_admin = true;
      const limitNum = Number(newStorageLimit);
      if (newStorageLimit >= 0) {
        body.storage_limit = newStorageLimit > 0 ? Math.round(limitNum * 1024 * 1024 * 1024) : 0;
      }

      const r = await apiFetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage({ type: "ok", text: `User "${d.username}" created!` });
      setShowCreate(false);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      setNewStorageLimit(0);
      await fetchUsers(page, search);
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    }
  }

  const totalUsed = users.reduce((sum, u) => sum + u.used, 0);
  const totalFiles = users.reduce((sum, u) => sum + u.file_count, 0);

  function doSearch() {
    setPage(1);
    fetchUsers(1, search);
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="card-title">🛡️ User Manager</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="btn-blue">
            {showCreate ? "Cancel" : "➕ Create User"}
          </button>
          <button onClick={() => fetchUsers(page, search)} className="btn-zinc">🔄 Refresh</button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-blue-600/40 bg-zinc-800/30 p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Create New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Username *</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                className="input-sm" placeholder="newuser" minLength={3} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="input-sm" placeholder="min 6 chars" minLength={6} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Storage Limit (GB, optional)</label>
              <input type="number" value={newStorageLimit} onChange={(e) => setNewStorageLimit(Number(e.target.value) || 0)}
                className="input-sm" placeholder="Default: 10 GB" min="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Role</label>
              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500" />
                <span className="text-xs text-zinc-300">Admin user</span>
              </label>
            </div>
          </div>
          <button type="submit" className="btn-green">Create User</button>
        </form>
      )}

      {message && !editId && (
        <div className={`text-xs px-3 py-2 rounded ${message.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
            placeholder="Search users..."
            className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); fetchUsers(1, ""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
          )}
        </div>
        <span className="text-xs text-zinc-500 self-center whitespace-nowrap">{total} user{total !== 1 ? "s" : ""} total</span>
        <span className="text-xs text-zinc-500 self-center whitespace-nowrap">{totalFiles} files</span>
        <span className="text-xs text-zinc-500 self-center whitespace-nowrap">{formatSize(totalUsed)}</span>
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
                        <label className="block text-xs text-zinc-500 mb-1">Storage Limit (GB)</label>
                        <input type="number" value={editStorage} onChange={(e) => setEditStorage(Number(e.target.value) || 0)} className="input-sm" min="0" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => fetchUsers(page - 1, search)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
          <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
          <button onClick={() => fetchUsers(page + 1, search)} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
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
