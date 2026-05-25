"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isImage } from "../../lib/utils";
import { formatSize, formatDate } from "../../lib/utils";
import type { FileInfo } from "../../lib/types";
import { Lightbox } from "../../components/Lightbox";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface GalleryPage {
  files: FileInfo[];
  total: number;
  page: number;
  totalPages: number;
}

export default function GalleryPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [galleryPage, setGalleryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageFiles = files.filter((f) => isImage(f.mime_type));

  const fetchGallery = useCallback(async (page = 1, searchTerm = "") => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (searchTerm) params.set("search", searchTerm);
      const r = await fetch(`${API_BASE}/gallery?${params.toString()}`);
      if (r.ok) {
        const d: GalleryPage = await r.json();
        setFiles(d.files);
        setGalleryPage(d.page);
        setTotalPages(d.totalPages);
        setTotal(d.total);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchGallery(1, search); }, [fetchGallery]);

  async function copyLink(filename: string, id: number) {
    await navigator.clipboard.writeText(`${location.origin}/file/${filename}`);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  }

  // Keyboard shortcuts for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1));
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(imageFiles.length - 1, (i ?? 0) + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, imageFiles.length]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="w-full max-w-3xl pt-12 pb-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">🖼️ Public Gallery</h1>
            <p className="text-zinc-500 text-sm mt-1">Browse publicly shared files</p>
          </div>
          <button onClick={() => router.push("/files")}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
            ← My Files
          </button>
        </div>
      </header>

      <div className="w-full max-w-3xl px-4 pb-16 space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") fetchGallery(1, search); }}
            placeholder="Search public files..."
            className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); fetchGallery(1, ""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
          )}
        </div>

        {/* Image grid */}
        {imageFiles.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Images ({imageFiles.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imageFiles.map((f, idx) => (
                <div key={f.id} onClick={() => setLightboxIndex(idx)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                  <img src={`${location.origin}/file/${f.filename}`} alt={f.original_name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                    <p className="text-xs text-white truncate">{f.original_name}</p>
                    <p className="text-xs text-zinc-400">{formatSize(f.size)} · {formatDate(f.created_at)}</p>
                    <button onClick={(e) => { e.stopPropagation(); copyLink(f.filename, f.id); }}
                      className="mt-1 px-2 py-0.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      {copiedId === f.id ? "✓ Copied" : "Copy Link"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* File list */}
        {(() => {
          const others = files.filter((f) => !isImage(f.mime_type));
          if (others.length === 0) return null;
          return (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Files ({others.length})</h2>
              <ul className="space-y-2">
                {others.map((f) => (
                  <li key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{f.original_name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatSize(f.size)} · {formatDate(f.created_at)}
                        {f.expires_at && <span className="text-amber-500 ml-1">· Expires {formatDate(f.expires_at)}</span>}
                      </p>
                    </div>
                    <button onClick={() => copyLink(f.filename, f.id)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap">
                      {copiedId === f.id ? "✓ Copied" : "Copy Link"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {files.length === 0 && <p className="text-sm text-zinc-600 text-center py-12">No public files yet. Be the first to share something!</p>}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => fetchGallery(galleryPage - 1, search)} disabled={galleryPage <= 1}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
            <span className="text-xs text-zinc-500">Page {galleryPage} of {totalPages}<span className="text-zinc-600 ml-1">({total} files)</span></span>
            <button onClick={() => fetchGallery(galleryPage + 1, search)} disabled={galleryPage >= totalPages}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox image={imageFiles[lightboxIndex]} index={lightboxIndex} total={imageFiles.length}
          hasPrev={lightboxIndex > 0} hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId} deletingId={null}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(imageFiles.length - 1, (i ?? 0) + 1))}
          onCopyLink={copyLink} onDelete={() => {}} />
      )}
    </div>
  );
}
