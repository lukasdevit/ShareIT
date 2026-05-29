'use client';

import { formatSize } from '@/lib/utils';

interface Props {
  used: number;
  limit: number;
}

export function StorageBar({ used, limit }: Props) {
  const percent = Math.min(100, (used / limit) * 100);

  return (
    <div className="w-full max-w-4xl xl:max-w-6xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>
          {formatSize(used)} of {formatSize(limit)}
        </span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : '#3b82f6',
            }}
          />
        </div>
        <span>{percent.toFixed(0)}%</span>
      </div>
    </div>
  );
}
