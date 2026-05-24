"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:3000";

interface FileInfo {
  id: number;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  created_at: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

export default function Home() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageFiles = files.filter((f) => isImage(f.mime_type));

  // Keyboard: close lightbox on Escape, arrow keys to navigate
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

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/files`);
      if (res.ok) setFiles(await res.json());
    } catch {
      // backend not running — ignore
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      await fetchFiles();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  async function copyLink(filename: string, id: number) {
    await navigator.clipboard.writeText(`${API}/file/${filename}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: number) {
    if (deletingId === id) {
      // Confirm delete
      try {
        const res = await fetch(`${API}/file/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (e) {
        setError((e as Error).message);
      }
      setDeletingId(null);
    } else {
      // First click — ask for confirmation
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 4000);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="w-full max-w-2xl pt-12 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight">📁 FileDrop</h1>
        <p className="text-zinc-500 text-sm mt-1">Upload & share files instantly</p>
      </header>

      {/* Upload zone */}
      <div className="w-full max-w-2xl px-4 mb-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed
            cursor-pointer transition-all select-none
            ${dragOver
              ? "border-blue-400 bg-blue-500/10"
              : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
            }
            ${uploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-zinc-400">Uploading...</span>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 mb-2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-zinc-400">Drop a file here or click to browse</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* File list */}
      {(() => {
        const images = files.filter((f) => isImage(f.mime_type));
        const others = files.filter((f) => !isImage(f.mime_type));

        return (
          <div className="w-full max-w-2xl px-4 pb-16 space-y-8">
            {/* Image gallery */}
            {images.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Images ({images.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
                    >
                      <img
                        src={`${API}/file/${f.filename}`}
                        alt={f.original_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                        <p className="text-xs text-white truncate">{f.original_name}</p>
                        <p className="text-xs text-zinc-400">
                          {formatSize(f.size)} · {formatDate(f.created_at)}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyLink(f.filename, f.id); }}
                            className="px-2 py-0.5 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                          >
                            {copiedId === f.id ? "Copied!" : "Copy"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                            className={`px-2 py-0.5 rounded text-xs ${
                              deletingId === f.id
                                ? "bg-red-600 text-white"
                                : "bg-zinc-700 hover:bg-red-800 text-zinc-300"
                            }`}
                          >
                            {deletingId === f.id ? "Confirm?" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Other files */}
            {others.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Files ({others.length})
                </h2>
                <ul className="space-y-2">
                  {others.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {f.original_name}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatSize(f.size)} · {formatDate(f.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copyLink(f.filename, f.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          {copiedId === f.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            deletingId === f.id
                              ? "bg-red-600 hover:bg-red-500 text-white"
                              : "bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-400"
                          }`}
                        >
                          {deletingId === f.id ? "Confirm?" : "Delete"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Empty state */}
            {files.length === 0 && (
              <p className="text-sm text-zinc-600">No files uploaded yet.</p>
            )}
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightboxIndex !== null && (() => {
        const img = imageFiles[lightboxIndex];
        if (!img) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setLightboxIndex(null)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Prev arrow */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1)); }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {lightboxIndex < imageFiles.length - 1 && (
              <button
                className="absolute right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.min(imageFiles.length - 1, (i ?? 0) + 1)); }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Preload adjacent images */}
            {lightboxIndex > 0 && (
              <img src={`${API}/file/${imageFiles[lightboxIndex - 1].filename}`} className="hidden" />
            )}
            {lightboxIndex < imageFiles.length - 1 && (
              <img src={`${API}/file/${imageFiles[lightboxIndex + 1].filename}`} className="hidden" />
            )}

            {/* Loading spinner */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            </div>

            {/* Image with fade-in */}
            <img
              key={img.filename}
              src={`${API}/file/${img.filename}`}
              alt={img.original_name}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg opacity-0 transition-opacity duration-300"
              onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Info bar */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{img.original_name}</p>
                  <p className="text-xs text-zinc-400">
                    {formatSize(img.size)} · {formatDate(img.created_at)} · {lightboxIndex + 1}/{imageFiles.length}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyLink(img.filename, img.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                  >
                    {copiedId === img.id ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      deletingId === img.id
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 hover:bg-red-800 text-zinc-300"
                    }`}
                  >
                    {deletingId === img.id ? "Confirm?" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
