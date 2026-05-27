"use client";

import { useState, useEffect, useCallback } from "react";
import { formatSize } from "../lib/utils";
import { useToast } from "./Toast";
import { CardSkeleton, RowSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { MetricCard, MetricGrid } from "./MetricCard";

interface BackupLog {
  id: number;
  timestamp: string;
  destination: string;
  status: string;
  size_bytes: number | null;
  error: string | null;
}

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export function BackupPanel({ apiFetch }: Props) {
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; results: { label: string; ok: boolean; error?: string }[] } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchHistory = useCallback(() => {
    setLoading(true);
    apiFetch("/admin/backup/history")
      .then((r) => r.json())
      .then((d) => setLogs(d.backups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function runBackupNow() {
    setRunning(true);
    setResult(null);
    try {
      const r = await apiFetch("/admin/backup/run", { method: "POST" });
      const d = await r.json();
      setResult(d);
      fetchHistory();
    } catch (err) {
      setResult({ ok: false, results: [{ label: "error", ok: false, error: (err as Error).message }] });
    } finally {
      setRunning(false);
    }
  }

  async function downloadLatest() {
    setDownloading(true);
    try {
      const r = await apiFetch("/admin/backup/latest");
      if (!r.ok) throw new Error("No backup available");
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "shareit-backup.db";
      a.click();
    } catch { /* */ }
    setDownloading(false);
  }

  const lastOk = logs.find((l) => l.status === "ok");
  const lastFail = logs.find((l) => l.status === "fail");
  const successCount = logs.filter((l) => l.status === "ok").length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  return (
    <section className="card space-y-5">
      {/* Metric cards */}
      <MetricGrid>
        <MetricCard
          label="Total Backups"
          value={logs.length}
          sub={logs.length > 0 ? `${successRate}% success rate` : undefined}
        />
        <MetricCard
          label="Last Backup"
          value={lastOk ? new Date(lastOk.timestamp).toLocaleDateString() : "—"}
          sub={lastOk ? new Date(lastOk.timestamp).toLocaleTimeString() : undefined}
        />
      </MetricGrid>

      <div className="flex items-center justify-between">
        <h2 className="card-title">🗄️ Database Backups</h2>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={runBackupNow} disabled={running} className="btn-blue text-xs">
          {running ? "Running…" : "▶ Backup Now"}
        </button>
        <button onClick={downloadLatest} disabled={downloading} className="btn-zinc text-xs">
          {downloading ? "Downloading…" : "⬇ Download Latest"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-lg text-xs ${result.ok ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
          {result.results.map((r) => (
            <p key={r.label}>{r.label}: {r.ok ? "✅ OK" : `❌ ${r.error}`}</p>
          ))}
        </div>
      )}

      {/* Status summary */}
      <div className="flex gap-4 text-xs text-zinc-500">
        {lastOk && <span>Last OK: {new Date(lastOk.timestamp).toLocaleString()} ({lastOk.destination})</span>}
        {lastFail && <span className="text-red-400">Last fail: {new Date(lastFail.timestamp).toLocaleString()} ({lastFail.destination})</span>}
        {!lastOk && !lastFail && <span>No backups yet</span>}
      </div>

      {/* History table */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-2">History</h3>
        {loading ? (
          <RowSkeleton cols={5} rows={3} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon="🗄️"
            title="No backup history"
            description="Run a backup now to start tracking."
            action={
              <button onClick={runBackupNow} disabled={running} className="btn-blue text-xs">
                ▶ Run First Backup
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-zinc-400">
              <thead>
                <tr className="text-left border-b border-zinc-800">
                  <th className="py-1.5 pr-3 font-medium">Time</th>
                  <th className="py-1.5 pr-3 font-medium">Dest</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 pr-3 font-medium">Size</th>
                  <th className="py-1.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-800/50">
                    <td className="py-1.5 pr-3 text-zinc-500">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{l.destination}</td>
                    <td className={`py-1.5 pr-3 ${l.status === "ok" ? "text-green-400" : "text-red-400"}`}>
                      {l.status}
                    </td>
                    <td className="py-1.5 pr-3">{l.size_bytes ? formatSize(l.size_bytes) : "-"}</td>
                    <td className="py-1.5 max-w-[200px] truncate text-red-400">{l.error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
