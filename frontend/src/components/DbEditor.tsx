"use client";

import { useState, useEffect } from "react";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onTablesChanged?: () => void;
  injectedSql?: string;
  onConsumed?: () => void;
}

export function DbEditor({ apiFetch, onTablesChanged, injectedSql, onConsumed }: Props) {
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);

  useEffect(() => {
    if (injectedSql) {
      setSqlQuery(injectedSql);
      onConsumed?.();
    }
  }, [injectedSql]);

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
      setSqlHistory((h) => [sqlQuery, ...h.filter((s) => s !== sqlQuery)].slice(0, 30));
      onTablesChanged?.();
    } catch (err) {
      setSqlError((err as Error).message);
    } finally {
      setSqlRunning(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">🗄️ Database Editor</h2>

      <form onSubmit={runSql} className="space-y-3">
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="SELECT * FROM users;"
          rows={3}
          className="flex-1 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-mono
                     focus:outline-none focus:border-blue-500 transition-colors resize-y w-full"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="submit" disabled={sqlRunning || !sqlQuery.trim()} className="btn-blue">
              {sqlRunning ? "Running…" : "▶ Run"}
            </button>
            <button type="button" onClick={() => { setSqlQuery(""); setSqlResult(null); setSqlError(null); }} className="btn-zinc">
              Clear
            </button>
          </div>
          {sqlHistory.length > 0 && (
            <select
              onChange={(e) => { if (e.target.value) setSqlQuery(e.target.value); e.target.value = ""; }}
              className="px-2 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs focus:outline-none max-w-50"
              value=""
            >
              <option value="">📋 History…</option>
              {sqlHistory.map((h, i) => (
                <option key={i} value={h}>{h.length > 60 ? h.slice(0, 60) + "…" : h}</option>
              ))}
            </select>
          )}
        </div>
      </form>

      {sqlError && <div className="msg-err"><p className="font-mono whitespace-pre-wrap">{sqlError}</p></div>}

      {sqlResult && <SqlResultDisplay result={sqlResult} />}
    </section>
  );
}

/* ── Helpers ── */

interface SqlResult {
  type: "read" | "write";
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  changes?: number;
  lastID?: number;
  warning?: string;
}

function mask(col: string, val: unknown): string {
  if (col === "password_hash") return "***";
  if (val === null) return "NULL";
  return String(val);
}

function SqlResultDisplay({ result: r }: { result: SqlResult }) {
  if (r.type === "write") {
    return (
      <div className="space-y-2">
        <div className="msg-ok">
          Query OK — {r.changes} row{r.changes !== 1 ? "s" : ""} affected
          {r.lastID ? `, last insert ID: ${r.lastID}` : ""}
        </div>
        {r.warning && <div className="msg-warn">{r.warning}</div>}
      </div>
    );
  }

  if (!r.columns || r.columns.length === 0) {
    return <p className="text-sm text-zinc-500">Query returned no rows.</p>;
  }

  return (
    <div className="table-result">
      <table>
        <thead>
          <tr>{r.columns.map((col) => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {r.rows!.map((row, i) => (
            <tr key={i}>
              {r.columns!.map((col) => {
                const raw = row[col];
                const str = mask(col, raw);
                const truncated = str.length > 200 ? str.slice(0, 200) + "…" : str;
                const tdClass = raw === null ? "text-zinc-600 italic" : col === "password_hash" && raw !== null ? "text-zinc-500" : "text-zinc-300";
                return <td key={col} className={tdClass} title={col === "password_hash" && raw !== null ? "hidden" : str}>{truncated}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-xs text-zinc-600 bg-zinc-800/30 border-t border-zinc-800">
        {r.rowCount} row{r.rowCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
