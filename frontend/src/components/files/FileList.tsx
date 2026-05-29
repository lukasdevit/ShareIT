'use client';

import { formatSize, formatDate, isOpenable } from '@/lib/utils';
import type { FileInfo } from '@/types';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '@/config/constants';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { CopyButton } from '@/components/ui/CopyButton';

interface Props {
  files: FileInfo[];
  total?: number;
  copiedId: number | null;
  deletingId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onDelete: (id: number) => void;
  onOpenViewer: (file: FileInfo) => void;
}

function getExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext.length <= 5 ? ext : '';
}

function TagBadge({ filename }: { filename: string }) {
  const ext = getExt(filename);
  const color = ext ? TAG_COLORS[ext] || DEFAULT_TAG_COLOR : DEFAULT_TAG_COLOR;
  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${color}`}
    >
      {ext ? `.${ext}` : '?'}
    </span>
  );
}

export function FileList({
  files,
  total,
  copiedId,
  deletingId,
  onCopyLink,
  onTogglePublic,
  onDelete,
  onOpenViewer,
}: Props) {
  return (
    <section>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li
            key={f.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
              ${isOpenable(f.mime_type) ? 'cursor-pointer' : ''}
              bg-zinc-900/50 border-zinc-800 hover:border-zinc-700`}
            onClick={() => isOpenable(f.mime_type) && onOpenViewer(f)}
          >
            {/* Tag badge */}
            <TagBadge filename={f.original_name} />
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {f.original_name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatSize(f.size)} · {formatDate(f.created_at)}
                {f.expires_at && (
                  <span className="text-amber-500 ml-1">
                    · Expires {formatDate(f.expires_at)}
                  </span>
                )}
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <VisibilityToggle
                isPublic={!!f.is_public}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePublic(f.id, !f.is_public);
                }}
              />
              <DeleteButton
                id={f.id}
                confirming={deletingId === f.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(f.id);
                }}
              />
              <CopyButton
                filename={f.filename}
                id={f.id}
                copiedId={copiedId}
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyLink(f.filename, f.id);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
