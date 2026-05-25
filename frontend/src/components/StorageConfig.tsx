"use client";

import { useState, useEffect } from "react";
import { formatSize } from "../lib/utils";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export function StorageConfig({ apiFetch }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function load() {
    setLoading(true);
    apiFetch("/admin/storage")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit() {
    setForm({
      backend: data?.backend || "local",
      b2_endpoint: data?.b2_endpoint || "",
      b2_region: data?.b2_region || "",
      b2_bucket: data?.b2_bucket || "",
      b2_prefix: data?.b2_prefix || "",
    });
    setEditing(true);
    setMsg(null);
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await apiFetch("/admin/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: "ok", text: `Saved: ${d.updated.join(", ")}` });
      setEditing(false);
      load();
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally { setSaving(false); }
  }

  if (loading) return <section className="card"><p className="text-sm text-zinc-500">Loading…</p></section>;
  if (!data) return <section className="card"><p className="text-sm text-red-400">Failed to load storage info.</p></section>;

  return (
    <section className="card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="card-title">💾 Storage Configuration</h2>
        {!editing ? (
          <button onClick={startEdit} className="btn-ghost text-xs">✏️ Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-green text-xs">{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(false)} className="btn-zinc text-xs">Cancel</button>
          </div>
        )}
      </div>

      {msg && <p className={`text-xs ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Backend</label>
            <select value={form.backend} onChange={(e) => setForm({ ...form, backend: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500">
              <option value="local">💻 Local filesystem</option>
              <option value="b2">☁️ Backblaze B2</option>
            </select>
          </div>
          {form.backend === "b2" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[["b2_endpoint", "Endpoint"], ["b2_region", "Region"], ["b2_bucket", "Bucket"], ["b2_prefix", "Prefix"]].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                  <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Backend" value={data.backend === "b2" ? "☁️ Backblaze B2" : "💻 Local filesystem"} />
            <StatCard label="Default user limit" value={formatSize(data.default_storage_limit)} />
          </div>
          {data.backend === "b2" && <B2Details data={data} />}
          {data.backend === "local" && data.disk_total > 0 && <DiskBar data={data} />}
          <Totals users={data.users} files={data.total_files} bytes={data.total_bytes} />
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
      <span className="text-xs text-zinc-500">{label}</span>
      <p className="text-sm font-medium text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

function B2Details({ data }: { data: any }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-300">B2 Configuration</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[["Endpoint", data.b2_endpoint], ["Region", data.b2_region], ["Bucket", data.b2_bucket], ["Prefix", data.b2_prefix]].map(([label, val]) => (
          <div key={label} className="p-2 rounded bg-zinc-800/30">
            <span className="text-zinc-500">{label}</span>
            <p className="text-zinc-300 mt-0.5 truncate">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiskBar({ data }: { data: any }) {
  const pct = data.disk_total > 0 ? Math.min(100, (data.disk_used / data.disk_total) * 100) : 0;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-300">Disk Usage</h3>
      <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#3b82f6" }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{formatSize(data.disk_used)} used</span>
        <span>{formatSize(data.disk_free)} free</span>
        <span>{formatSize(data.disk_total)} total</span>
      </div>
    </div>
  );
}

function Totals({ users, files, bytes }: { users: number; files: number; bytes: number }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-300">Totals</h3>
      <div className="flex gap-4 text-xs text-zinc-400">
        <span>{users} users</span>
        <span>{files} files</span>
        <span>{formatSize(bytes)} stored</span>
      </div>
    </div>
  );
}
