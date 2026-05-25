"use client";

import { formatSize, formatDate } from "../lib/utils";
import type { FileInfo } from "../lib/types";

interface Props {
  images: FileInfo[];
  copiedId: number | null;
  deletingId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onDelete: (id: number) => void;
  onOpenLightbox: (index: number) => void;
}

export function ImageGallery({ images, copiedId, deletingId, onCopyLink, onDelete, onOpenLightbox }: Props) {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Images ({images.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((f, idx) => (
          <div key={f.id} onClick={() => onOpenLightbox(idx)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
            <img src={`${location.origin}/file/${f.filename}`} alt={f.original_name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
              <p className="text-xs text-white truncate">{f.original_name}</p>
              <p className="text-xs text-zinc-400">{formatSize(f.size)} · {formatDate(f.created_at)}</p>
              <div className="flex gap-1 mt-1">
                <button onClick={(e) => { e.stopPropagation(); onCopyLink(f.filename, f.id); }}
                  className="px-2 py-0.5 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200">{copiedId === f.id ? "Copied!" : "Copy"}</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
                  className={`px-2 py-0.5 rounded text-xs ${deletingId === f.id ? "bg-red-600 text-white" : "bg-zinc-700 hover:bg-red-800 text-zinc-300"}`}>{deletingId === f.id ? "Confirm?" : "Delete"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
