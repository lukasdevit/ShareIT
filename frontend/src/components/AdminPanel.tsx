"use client";

import { useCallback, useState } from "react";
import { UserManager } from "./UserManager";
import { TableBrowser } from "./TableBrowser";
import { StorageConfig } from "./StorageConfig";
import { SslConfig } from "./SslConfig";
import { Analytics } from "./Analytics";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  tab: "users" | "files" | "storage" | "ssl" | "analytics";
}

export function AdminPanel({ apiFetch, tab }: Props) {
  const [tablesKey, setTablesKey] = useState(0);
  const refreshTables = useCallback(() => setTablesKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      {tab === "users" && <UserManager apiFetch={apiFetch} />}
      {tab === "files" && (
        <section className="card">
          <TableBrowser apiFetch={apiFetch} refreshKey={tablesKey} />
        </section>
      )}
      {tab === "storage" && <StorageConfig apiFetch={apiFetch} />}
      {tab === "ssl" && <SslConfig />}
      {tab === "analytics" && <Analytics />}
    </div>
  );
}
