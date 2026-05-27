"use client";

import { formatSize, formatDate, isText, isImage, isOpenable } from "../lib/utils";
import type { FileInfo } from "../lib/types";

interface Props {
  files: FileInfo[];
  total?: number;
  copiedId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onOpenViewer: (file: FileInfo) => void;
}

function fileIcon(mime: string, name: string): string {
  if (isImage(mime)) return "🖼️";
  if (mime === "application/pdf") return "�";
  if (mime === "application/zip" || mime === "application/gzip" || mime.includes("compressed") || name.endsWith(".zip") || name.endsWith(".tar.gz") || name.endsWith(".7z") || name.endsWith(".rar")) return "📦";
  if (isText(mime)) return "📝";
  return "📎";
}

export function FileList({ files, total, copiedId, onCopyLink, onTogglePublic, onOpenViewer }: Props) {
  return (
    <section>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li key={f.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
              ${isOpenable(f.mime_type) ? "cursor-pointer" : ""}
              bg-zinc-900/50 border-zinc-800 hover:border-zinc-700`}
            onClick={() => isOpenable(f.mime_type) && onOpenViewer(f)}>
            {/* File icon */}
            <span className="text-xl shrink-0">{fileIcon(f.mime_type, f.original_name)}</span>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{f.original_name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatSize(f.size)} · {formatDate(f.created_at)}
                {f.expires_at && <span className="text-amber-500 ml-1">· Expires {formatDate(f.expires_at)}</span>}
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onTogglePublic(f.id, !f.is_public); }}
                className="p-1.5 rounded-md text-xs transition-colors hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                title={f.is_public ? "Make private" : "Make public"}>
                {f.is_public ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onCopyLink(f.filename, f.id); }}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap">
                {copiedId === f.id ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
