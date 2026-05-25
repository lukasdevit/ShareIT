"use client";

import { useCallback, useState } from "react";
import { UserManager } from "./UserManager";
import { DbEditor } from "./DbEditor";
import { TableBrowser } from "./TableBrowser";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  tab: "users" | "files" | "storage" | "ssl" | "analytics";
}

export function AdminPanel({ apiFetch, tab }: Props) {
  const [sqlToSet, setSqlToSet] = useState("");
  const [tablesKey, setTablesKey] = useState(0);
  const refreshTables = useCallback(() => setTablesKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      {tab === "users" && <UserManager apiFetch={apiFetch} />}
      {tab === "files" && (
        <section className="card">
          <DbEditor apiFetch={apiFetch} onTablesChanged={refreshTables} injectedSql={sqlToSet} onConsumed={() => setSqlToSet("")} />
          <TableBrowser apiFetch={apiFetch} onSetSql={setSqlToSet} refreshKey={tablesKey} />
        </section>
      )}
      {tab === "storage" && <StorageConfig />}
      {tab === "ssl" && <SslConfig />}
      {tab === "analytics" && <Analytics />}
    </div>
  );
}

/* ── Placeholder tabs (to be built next) ── */

function StorageConfig() {
  return (
    <section className="card">
      <h2 className="card-title">💾 Storage Configuration</h2>
      <p className="text-sm text-zinc-400">Coming soon — view and manage storage backend settings.</p>
    </section>
  );
}

function SslConfig() {
  return (
    <section className="card">
      <h2 className="card-title">🔒 SSL Configuration</h2>
      <p className="text-sm text-zinc-400">Coming soon — view certificate status and HTTPS settings.</p>
    </section>
  );
}

function Analytics() {
  return (
    <section className="card">
      <h2 className="card-title">📊 Analytics</h2>
      <p className="text-sm text-zinc-400">Coming soon — view usage statistics and performance metrics.</p>
    </section>
  );
}
