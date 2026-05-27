"use client";

import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  children?: ReactNode;
}

export function MetricCard({ label, value, sub, children }: Props) {
  return (
    <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <p className="text-xl font-semibold text-zinc-100 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      {children}
    </div>
  );
}

export function MetricGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}
