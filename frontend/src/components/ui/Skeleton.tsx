'use client';

/** Pulse-animated placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse-subtle bg-zinc-800 rounded ${className}`} />
  );
}
