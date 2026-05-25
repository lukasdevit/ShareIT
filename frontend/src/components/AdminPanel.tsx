"use client";

import { useCallback, useState } from "react";
import { UserManager } from "./UserManager";
import { DbEditor } from "./DbEditor";
import { TableBrowser } from "./TableBrowser";
import { StorageConfig } from "./StorageConfig";
import { SslConfig } from "./SslConfig";
import { Analytics } from "./Analytics";

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
      {tab === "storage" && <StorageConfig apiFetch={apiFetch} />}
      {tab === "ssl" && <SslConfig />}
      {tab === "analytics" && <Analytics />}
    </div>
  );
}
