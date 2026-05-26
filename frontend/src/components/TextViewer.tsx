"use client";

import { marked } from "marked";
import { formatSize } from "../lib/utils";
import type { FileInfo } from "../lib/types";

interface Props {
  file: FileInfo;
  content: string | null;
  copiedId: number | null;
  deletingId: number | null;
  onClose: () => void;
  onDelete: (id: number) => void;
  onCopyLink: (filename: string, id: number) => void;
}

export function TextViewer({ file, content, copiedId, deletingId, onClose, onDelete, onCopyLink }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{file.original_name}</p>
            <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onCopyLink(file.filename, file.id)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors">
              {copiedId === file.id ? "Copied!" : "Copy link"}
            </button>
            <button onClick={() => onDelete(file.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${deletingId === file.id ? "bg-red-600 hover:bg-red-500 text-white" : "bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-400"}`}>{deletingId === file.id ? "Delete?" : "Delete"}</button>
            <button onClick={onClose} className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          {content === null ? (
            <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : file.mime_type === "text/markdown" || file.original_name.endsWith(".md") ? (
            <div className="p-4 text-sm text-zinc-300 markdown-body" dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
          ) : (
            <pre className="p-4 text-sm text-zinc-300 font-mono whitespace-pre-wrap break-all">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
