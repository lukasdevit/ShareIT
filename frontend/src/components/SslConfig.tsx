"use client";

import { useState, useEffect, useMemo } from "react";

interface SslData {
  domain: string;
  is_local: boolean;
  protocol: string;
  cert_valid: boolean;
  cert_expiry: string | null;
  managed_by: string;
  note: string;
}

export function SslConfig() {
  const [data, setData] = useState<SslData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("shareit_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/admin/ssl`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const daysLeft = useMemo(() => {
    if (!data?.cert_expiry) return null;
    return Math.ceil((new Date(data.cert_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [data?.cert_expiry]);

  if (loading) return <section className="card"><p className="text-sm text-zinc-500">Loading…</p></section>;
  if (!data) return <section className="card"><p className="text-sm text-red-400">Failed to load SSL info.</p></section>;

  return (
    <section className="card space-y-5">
      <h2 className="card-title">🔒 SSL / HTTPS</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SslCard label="Domain" value={data.domain} large />
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <span className="text-xs text-zinc-500">Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${data.cert_valid ? "bg-green-400" : data.is_local ? "bg-amber-400" : "bg-red-400"}`} />
            <p className="text-sm font-medium text-zinc-200">
              {data.cert_valid ? "✅ HTTPS Active" : data.is_local ? "🔸 Localhost (no SSL)" : "❌ No certificate"}
            </p>
          </div>
        </div>
      </div>

      {data.cert_valid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SslCard label="Certificate expires" value={data.cert_expiry || "Unknown"}>
            {daysLeft !== null && (
              <p className={`text-xs mt-1 ${daysLeft < 30 ? "text-red-400" : daysLeft < 60 ? "text-amber-400" : "text-green-400"}`}>
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
              </p>
            )}
          </SslCard>
          <SslCard label="Managed by" value={data.managed_by} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SslCard label="Protocol" value={data.protocol.toUpperCase()} />
        <SslCard label="Auto-renewal" value={data.is_local ? "N/A" : "✅ Enabled"} />
      </div>

      <div className={`p-3 rounded-lg text-xs ${data.is_local ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" : "bg-green-500/10 border border-green-500/20 text-green-300"}`}>
        {data.note}
      </div>
    </section>
  );
}

function SslCard({ label, value, large, children }: { label: string; value: string; large?: boolean; children?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
      <span className="text-xs text-zinc-500">{label}</span>
      <p className={`${large ? "text-lg font-semibold" : "text-sm font-medium"} text-zinc-200 mt-0.5`}>{value}</p>
      {children}
    </div>
  );
}
