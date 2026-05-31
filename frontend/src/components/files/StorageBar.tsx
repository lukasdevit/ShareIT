'use client';

import { formatSize } from '@/lib/utils';

interface Props {
  used: number;
  limit: number;
}

export function StorageBar({ used, limit }: Props) {
  const percent = Math.min(100, (used / limit) * 100);

  return (
    <div className="w-full max-w-4xl xl:max-w-6xl mx-auto px-4 pt-5 pb-2">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {formatSize(used)}
          <span className="text-zinc-700 mx-0.5">/</span>
          {formatSize(limit)}
        </span>
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-400 w-8 text-right">
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
