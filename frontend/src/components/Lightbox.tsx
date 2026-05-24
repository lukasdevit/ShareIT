"use client";

import { formatSize, formatDate } from "../lib/utils";
import type { FileInfo } from "../lib/types";

const API = "http://localhost:3000";

interface Props {
  image: FileInfo;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  copiedId: number | null;
  deletingId: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCopyLink: (filename: string, id: number) => void;
  onDelete: (id: number) => void;
}

export function Lightbox({ image, index, total, hasPrev, hasNext, copiedId, deletingId, onClose, onPrev, onNext, onCopyLink, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" onClick={onClose}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      {hasPrev && (
        <button className="absolute left-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {hasNext && (
        <button className="absolute right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNext(); }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      {hasPrev && <img src={`${API}/file/${image.filename}`} className="hidden" />}
      {hasNext && <img src={`${API}/file/${image.filename}`} className="hidden" />}
      <img key={image.filename} src={`${API}/file/${image.filename}`} alt={image.original_name}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg opacity-0 transition-opacity duration-300"
        onLoad={(e) => (e.currentTarget.style.opacity = "1")} onClick={(e) => e.stopPropagation()} />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{image.original_name}</p>
            <p className="text-xs text-zinc-400">{formatSize(image.size)} · {formatDate(image.created_at)} · {index + 1}/{total}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onCopyLink(image.filename, image.id)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors">{copiedId === image.id ? "Copied!" : "Copy link"}</button>
            <button onClick={() => onDelete(image.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${deletingId === image.id ? "bg-red-600 text-white" : "bg-zinc-800 hover:bg-red-800 text-zinc-300"}`}>{deletingId === image.id ? "Confirm?" : "Delete"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
