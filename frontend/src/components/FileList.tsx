"use client";

import { formatSize, formatDate, isText } from "../lib/utils";
import type { FileInfo } from "../lib/types";

interface Props {
  files: FileInfo[];
  copiedId: number | null;
  deletingId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onDelete: (id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onOpenViewer: (file: FileInfo) => void;
}

export function FileList({ files, copiedId, deletingId, onCopyLink, onDelete, onTogglePublic, onOpenViewer }: Props) {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Files ({files.length})</h2>
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.id}
            className={`flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors ${isText(f.mime_type) ? "cursor-pointer" : ""}`}
            onClick={() => isText(f.mime_type) && onOpenViewer(f)}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{f.original_name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{formatSize(f.size)} · {formatDate(f.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onTogglePublic(f.id, !f.is_public); }}
                className="px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                title={f.is_public ? "Click to make private" : "Click to make public"}>
                {f.is_public ? "🌐" : "🔒"}
              </button>
              <button onClick={() => onCopyLink(f.filename, f.id)}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">{copiedId === f.id ? "Copied!" : "Copy link"}</button>
              <button onClick={() => onDelete(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${deletingId === f.id ? "bg-red-600 hover:bg-red-500 text-white" : "bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-400"}`}>{deletingId === f.id ? "Confirm?" : "Delete"}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
