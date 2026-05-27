"use client";

import { formatSize, formatDate, isOpenable } from "../lib/utils";
import type { FileInfo } from "../lib/types";

interface Props {
  files: FileInfo[];
  total?: number;
  copiedId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onOpenViewer: (file: FileInfo) => void;
}

function getExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ext.length <= 5 ? ext : "";
}

const TAG_COLORS: Record<string, string> = {
  pdf: "bg-red-500/10 text-red-400 border-red-500/20",
  txt: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  md: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  json: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  xml: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  html: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  css: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  js: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ts: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  jsx: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  tsx: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  py: "bg-green-500/10 text-green-400 border-green-500/20",
  java: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  c: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  cpp: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  sh: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  yaml: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  yml: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  zip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  gz: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  tar: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "7z": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rar: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  png: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  jpg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  jpeg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  gif: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  webp: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  svg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  mp3: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  wav: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  ogg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  mp4: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  webm: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  dll: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  exe: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const DEFAULT_TAG = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

function TagBadge({ filename }: { filename: string }) {
  const ext = getExt(filename);
  const color = ext ? TAG_COLORS[ext] || DEFAULT_TAG : DEFAULT_TAG;
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${color}`}>
      {ext ? `.${ext}` : "?"}
    </span>
  );
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
            {/* Tag badge */}
            <TagBadge filename={f.original_name} />
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
