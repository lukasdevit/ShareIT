"use client";

import { useCallback, useState } from "react";
import { UserManager } from "./UserManager";
import { DbEditor } from "./DbEditor";
import { TableBrowser } from "./TableBrowser";

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export function AdminPanel({ apiFetch }: Props) {
  const [sqlToSet, setSqlToSet] = useState("");
  const [tablesKey, setTablesKey] = useState(0);

  const refreshTables = useCallback(() => setTablesKey((k) => k + 1), []);

  return (
    <>
      <UserManager apiFetch={apiFetch} />
      <section className="card">
        <DbEditor apiFetch={apiFetch} onTablesChanged={refreshTables} injectedSql={sqlToSet} onConsumed={() => setSqlToSet("")} />
        <TableBrowser apiFetch={apiFetch} onSetSql={setSqlToSet} refreshKey={tablesKey} />
      </section>
    </>
  );
}
