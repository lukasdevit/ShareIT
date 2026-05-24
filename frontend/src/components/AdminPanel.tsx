"use client";

import { useState, useEffect } from "react";
import { formatSize, formatDate } from "../lib/utils";
import type { AdminUserRow } from "../lib/types";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export function AdminPanel({ apiFetch }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editStorage, setEditStorage] = useState("");
  const [editAdmin, setEditAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<{
    type: "read" | "write";
    columns?: string[];
    rows?: Record<string, unknown>[];
    rowCount?: number;
    changes?: number;
    lastID?: number;
    warning?: string;
  } | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [tables, setTables] = useState<{
    name: string;
    columns: { name: string; type: string; notnull: number; pk: number }[];
    rowCount: number;
  }[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [deleteRowConfirm, setDeleteRowConfirm] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/users");
      if (r.ok) setUsers(await r.json());
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function fetchTables() {
    try {
      const r = await apiFetch("/admin/db/tables");
      if (r.ok) setTables(await r.json());
    } catch { /* */ }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTables(); }, []);

  async function loadTableData(tableName: string) {
    setTableLoading(true);
    setTableData(null);
    try {
      const r = await apiFetch("/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: `SELECT * FROM "${tableName}" LIMIT 100;` }),
      });
      const d = await r.json();
      if (r.ok && d.type === "read") {
        setTableData({ columns: d.columns || [], rows: d.rows || [] });
      }
    } catch { /* */ }
    setTableLoading(false);
  }

  function handleTableClick(tableName: string) {
    if (expandedTable === tableName) {
      setExpandedTable(null);
      setTableData(null);
    } else {
      setExpandedTable(tableName);
      loadTableData(tableName);
    }
  }

  async function deleteTableRow(tableName: string, pkCol: string, pkVal: unknown) {
    const escaped = typeof pkVal === "string" ? `'${pkVal.replace(/'/g, "''")}'` : String(pkVal ?? "NULL");
    try {
      const r = await apiFetch("/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: `DELETE FROM "${tableName}" WHERE "${pkCol}" = ${escaped};` }),
      });
      const d = await r.json();
      if (r.ok) {
        setDeleteRowConfirm(null);
        loadTableData(tableName);
        fetchTables(); // refresh row counts
      } else {
        setSqlError(d.error);
      }
    } catch (err) {
      setSqlError((err as Error).message);
    }
  }

  function maskIfSensitive(col: string, val: unknown): string {
    if (col === "password_hash") return "***";
    if (val === null) return "NULL";
    return String(val);
  }

  function openEdit(u: AdminUserRow) {
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

  async function runSql(e: React.FormEvent) {
    e.preventDefault();
    if (!sqlQuery.trim()) return;
    setSqlRunning(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const r = await apiFetch("/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSqlResult(d);
      setSqlHistory((h) => {
        const updated = [sqlQuery, ...h.filter((s) => s !== sqlQuery)].slice(0, 30);
        return updated;
      });
    } catch (err) {
      setSqlError((err as Error).message);
    } finally {
      setSqlRunning(false);
    }
  }

  const totalUsed = users.reduce((sum, u) => sum + u.used, 0);
  const totalFiles = users.reduce((sum, u) => sum + u.file_count, 0);

  return (
    <>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">🛡️ Admin Panel</h2>
        <button
          onClick={fetchUsers}
          className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-zinc-400">{users.length} user{users.length !== 1 ? "s" : ""}</span>
        <span className="text-zinc-400">{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
        <span className="text-zinc-400">{formatSize(totalUsed)} total</span>
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
                className={`rounded-lg border p-3 transition-colors ${
                  isEditing
                    ? "border-blue-600 bg-zinc-800/50"
                    : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                }`}
              >
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-200">
                        Editing: {u.username}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1 rounded text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="px-3 py-1 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Storage Limit (bytes)</label>
                        <input
                          type="number"
                          value={editStorage}
                          onChange={(e) => setEditStorage(e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                          min="0"
                        />
                        <span className="text-xs text-zinc-600">{formatSize(Number(editStorage) || 0)}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Admin</label>
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editAdmin}
                            onChange={(e) => setEditAdmin(e.target.checked)}
                            className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs text-zinc-300">Is admin</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">New Password</label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="(leave blank)"
                          className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-blue-500 placeholder:text-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {message && (
                        <p className={`text-xs ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                          {message.text}
                        </p>
                      )}
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-2 text-xs ml-auto">
                          <span className="text-red-400">Confirm delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-medium transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(u.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 hover:bg-red-800 text-red-300 transition-colors ml-auto"
                        >
                          🗑 Delete User
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">
                          {u.username}
                        </span>
                        {u.is_admin === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{formatSize(u.used)} / {formatSize(u.storage_limit)}</span>
                      <span>{u.file_count} files</span>
                      <span>Joined {formatDate(u.created_at)}</span>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${usagePercent}%`,
                          background: usagePercent > 90 ? "#ef4444" : usagePercent > 70 ? "#f59e0b" : "#3b82f6",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>

    {/* Database Editor */}
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
      <h2 className="text-lg font-semibold">🗄️ Database Editor</h2>
      <form onSubmit={runSql} className="space-y-3">
        <div className="flex gap-2">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="SELECT * FROM users;"
            rows={3}
            className="flex-1 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sqlRunning || !sqlQuery.trim()}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
            >
              {sqlRunning ? "Running…" : "▶ Run"}
            </button>
            <button
              type="button"
              onClick={() => { setSqlQuery(""); setSqlResult(null); setSqlError(null); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Clear
            </button>
          </div>
          {sqlHistory.length > 0 && (
            <select
              onChange={(e) => { if (e.target.value) setSqlQuery(e.target.value); e.target.value = ""; }}
              className="px-2 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs focus:outline-none max-w-[200px]"
              value=""
            >
              <option value="">📋 History…</option>
              {sqlHistory.map((h, i) => (
                <option key={i} value={h}>
                  {h.length > 60 ? h.slice(0, 60) + "…" : h}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>

      {/* Schema / Data browser */}
      {tables.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Tables</p>
          <div className="flex flex-wrap gap-1">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => handleTableClick(t.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  expandedTable === t.name
                    ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                    : "bg-zinc-800/50 text-zinc-300 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                <span>{t.name}</span>
                <span className="text-zinc-500">{t.rowCount}</span>
              </button>
            ))}
          </div>

          {expandedTable && tableLoading && (
            <p className="text-xs text-zinc-500 py-2">Loading {expandedTable}…</p>
          )}

          {expandedTable && tableData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">{expandedTable}</span>
                  <span className="text-xs text-zinc-600">
                    {tableData.rows.length} row{tableData.rows.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSqlQuery(`SELECT * FROM ${expandedTable} LIMIT 100;`)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                  >
                    Edit in SQL
                  </button>
                  <button
                    onClick={() => loadTableData(expandedTable)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-zinc-800 max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-800/70 sticky top-0">
                      <th className="px-2 py-1.5 w-6"></th>
                      {tableData.columns.map((col) => (
                        <th
                          key={col}
                          className="px-2.5 py-1.5 text-left text-zinc-400 font-medium whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, i) => {
                      const pkCol = tableData.columns[0];
                      const pkVal = row[pkCol];
                      const rowKey = `${i}-${pkVal}`;
                      const isConfirming = deleteRowConfirm === rowKey;
                      const isAdminRow = expandedTable === "users" && (row["is_admin"] === 1 || row["is_admin"] === "1");
                      return (
                      <tr
                        key={rowKey}
                        className={`border-t border-zinc-800/50 ${
                          i % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/10"
                        }`}
                      >
                        <td className="px-1 py-1 text-center">
                          {isAdminRow ? (
                            <span className="text-[10px] text-amber-500/50 px-1" title="Cannot delete admin user">🔒</span>
                          ) : isConfirming ? (
                            <span className="flex items-center gap-0.5">
                              <button
                                onClick={() => deleteTableRow(expandedTable, pkCol, pkVal)}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1"
                                title="Confirm delete"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setDeleteRowConfirm(null)}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteRowConfirm(rowKey)}
                              className="text-[10px] text-zinc-600 hover:text-red-400 px-1 transition-colors"
                              title="Delete row"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                        {tableData.columns.map((col) => {
                          const raw = row[col];
                          const str = maskIfSensitive(col, raw);
                          const truncated = str.length > 150 ? str.slice(0, 150) + "…" : str;
                          const isNull = raw === null;
                          const isMasked = col === "password_hash" && raw !== null;
                          return (
                            <td
                              key={col}
                              className={`px-2.5 py-1 whitespace-nowrap max-w-[250px] overflow-hidden text-ellipsis ${
                                isNull ? "text-zinc-600 italic" : isMasked ? "text-zinc-500" : "text-zinc-300"
                              }`}
                              title={isMasked ? "hidden" : str}
                            >
                              {truncated}
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {sqlError && (
        <div className="rounded-md bg-red-900/30 border border-red-800 p-3">
          <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">{sqlError}</p>
        </div>
      )}

      {sqlResult && (
        <div className="space-y-2">
          {sqlResult.type === "write" ? (
            <div className="space-y-2">
              <div className="rounded-md bg-green-900/20 border border-green-800 p-3 text-sm text-green-400">
                Query OK — {sqlResult.changes} row{sqlResult.changes !== 1 ? "s" : ""} affected
                {sqlResult.lastID ? `, last insert ID: ${sqlResult.lastID}` : ""}
              </div>
              {sqlResult.warning && (
                <div className="rounded-md bg-amber-900/20 border border-amber-800 p-3 text-sm text-amber-400">
                  {sqlResult.warning}
                </div>
              )}
            </div>
          ) : sqlResult.columns && sqlResult.columns.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-800/50">
                    {sqlResult.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-zinc-400 font-medium whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sqlResult.rows!.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/10"}
                    >
                      {sqlResult.columns!.map((col) => {
                        const raw = row[col];
                        const str = maskIfSensitive(col, raw);
                        const truncated = str.length > 200 ? str.slice(0, 200) + "…" : str;
                        const isNull = raw === null;
                        const isMasked = col === "password_hash" && raw !== null;
                        return (
                          <td
                            key={col}
                            className={`px-3 py-1.5 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis ${
                              isNull ? "text-zinc-600 italic" : isMasked ? "text-zinc-500" : "text-zinc-300"
                            }`}
                            title={isMasked ? "hidden" : str}
                          >
                            {truncated}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-1.5 text-xs text-zinc-600 bg-zinc-800/30 border-t border-zinc-800">
                {sqlResult.rowCount} row{sqlResult.rowCount !== 1 ? "s" : ""}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Query returned no rows.</p>
          )}
        </div>
      )}
    </section>
    </>
  );
}
