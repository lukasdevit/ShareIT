"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { UserManager } from "./UserManager";
import { TableBrowser } from "./TableBrowser";
import { StorageConfig } from "./StorageConfig";
import { SslConfig } from "./SslConfig";
import { Analytics } from "./Analytics";
import { BackupPanel } from "./BackupPanel";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  tab: "users" | "database" | "storage" | "ssl" | "analytics" | "backups";
}

export function AdminPanel({ apiFetch, tab }: Props) {
  const router = useRouter();
  const [tablesKey, setTablesKey] = useState(0);
  const refreshTables = useCallback(() => setTablesKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/files")}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        ← Back to files
      </button>

      {tab === "users" && <UserManager apiFetch={apiFetch} />}
      {tab === "database" && (
        <section className="card">
          <TableBrowser apiFetch={apiFetch} refreshKey={tablesKey} />
        </section>
      )}
      {tab === "storage" && <StorageConfig apiFetch={apiFetch} />}
      {tab === "ssl" && <SslConfig apiFetch={apiFetch} />}
      {tab === "analytics" && <Analytics apiFetch={apiFetch} />}
      {tab === "backups" && <BackupPanel apiFetch={apiFetch} />}
    </div>
  );
}
