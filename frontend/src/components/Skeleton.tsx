"use client";

/** Pulse-animated placeholder block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse-subtle bg-zinc-800 rounded ${className}`} />;
}

/** Full card skeleton with header + body lines. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-5 rounded-lg border border-zinc-800 bg-zinc-900/50">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

/** Row-level skeleton for table loading. */
export function RowSkeleton({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
