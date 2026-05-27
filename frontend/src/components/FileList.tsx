"use client";

import { formatSize, formatDate, isOpenable } from "../lib/utils";
import type { FileInfo } from "../lib/types";
import { VisibilityToggle } from "./VisibilityToggle";
import { DeleteButton } from "./DeleteButton";
import { CopyButton } from "./CopyButton";

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

export function FileList({ files, total, copiedId, deletingId, onCopyLink, onTogglePublic, onDelete, onOpenViewer }: Props) {
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
              <VisibilityToggle isPublic={!!f.is_public} onClick={(e) => { e.stopPropagation(); onTogglePublic(f.id, !f.is_public); }} />
              <DeleteButton id={f.id} confirming={deletingId === f.id} onClick={(e) => { e.stopPropagation(); onDelete(f.id); }} />
              <CopyButton filename={f.filename} id={f.id} copiedId={copiedId} onClick={(e) => { e.stopPropagation(); onCopyLink(f.filename, f.id); }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
