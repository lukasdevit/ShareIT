"use client";

import { useState, useCallback } from "react";
import { ToastProvider } from "./Toast";
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
  const [tablesKey, setTablesKey] = useState(0);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const refreshTables = useCallback(() => setTablesKey((k) => k + 1), []);

  return (
    <ToastProvider>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{TAB_LABELS[tab]}</h1>
          <p className="text-sm text-zinc-500 mt-1">{TAB_DESCRIPTIONS[tab]}</p>
        </div>

        {tab === "users" && <UserManager apiFetch={apiFetch} />}
        {tab === "database" && <TableBrowser apiFetch={apiFetch} refreshKey={tablesKey} expanded={expandedTable} onExpand={setExpandedTable} />}
        {tab === "storage" && <StorageConfig apiFetch={apiFetch} />}
        {tab === "ssl" && <SslConfig apiFetch={apiFetch} />}
        {tab === "analytics" && <Analytics apiFetch={apiFetch} />}
        {tab === "backups" && <BackupPanel apiFetch={apiFetch} />}
      </div>
    </ToastProvider>
  );
}

const TAB_LABELS: Record<string, string> = {
  users: "Users",
  database: "Database",
  storage: "Storage",
  ssl: "SSL / HTTPS",
  analytics: "Analytics",
  backups: "Backups",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  users: "Manage user accounts, storage limits, and admin permissions.",
  database: "Browse and manage database tables directly.",
  storage: "Configure storage backends and view usage across all users.",
  ssl: "Monitor SSL certificate status and HTTPS configuration.",
  analytics: "View upload trends, top users, and file type distribution.",
  backups: "Run and download database backups, view backup history.",
};
