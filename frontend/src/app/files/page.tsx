"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isImage } from "../../lib/utils";
import type { FileInfo, FilePage } from "../../lib/types";
import { useAuth } from "../../lib/api";
import { UploadZone } from "../../components/UploadZone";
import { ImageGallery } from "../../components/ImageGallery";
import { FileList } from "../../components/FileList";
import { Lightbox } from "../../components/Lightbox";
import { TextViewer } from "../../components/TextViewer";

export default function FilesPage() {
  const { user, logout, api } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filePage, setFilePage] = useState(1);
  const [fileTotalPages, setFileTotalPages] = useState(0);
  const [fileTotal, setFileTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expireDays, setExpireDays] = useState<string>("");

  const imageFiles = files.filter((f) => isImage(f.mime_type));

  // Redirect if not logged in
  useEffect(() => { if (!user) router.replace("/"); }, [user, router]);

  // Fetch files
  const fetchFiles = useCallback(async (page = 1, searchTerm = "") => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (searchTerm) params.set("search", searchTerm);
      const r = await api(`/files?${params.toString()}`);
      if (r.ok) {
        const d: FilePage = await r.json();
        setFiles(d.files);
        setFilePage(d.page);
        setFileTotalPages(d.totalPages);
        setFileTotal(d.total);
      }
    } catch { /* */ }
  }, [user, api]);

  useEffect(() => { fetchFiles(1, search); }, [fetchFiles, search]);

  // Keyboard shortcuts for lightbox
  useEffect(() => {
    if (lightboxIndex === null && viewingFile === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxIndex(null); setViewingFile(null); setFileContent(null); }
      if (lightboxIndex !== null) {
        if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1));
        if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(imageFiles.length - 1, (i ?? 0) + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, viewingFile, imageFiles.length]);

  // Upload with progress
  async function uploadFile(file: File) {
    setUploading(true); setError(null); setUploadProgress(0);
    try {
      const token = localStorage.getItem("shareit_token");
      const f = new FormData(); f.append("file", file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/upload${expireDays ? `?expires=${expireDays}` : ""}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        if (expireDays) xhr.setRequestHeader("X-File-Expires", expireDays);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const d = JSON.parse(xhr.responseText);
              reject(new Error(d.error || "Upload failed"));
            } catch { reject(new Error("Upload failed")); }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(f);
      });

      await fetchFiles(1, search);
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }

  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }

  // Actions
  async function copyLink(filename: string, id: number) {
    await navigator.clipboard.writeText(`${location.origin}/file/${filename}`);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  }
  async function handleDelete(id: number) {
    if (deletingId === id) {
      try { const r = await api(`/file/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Delete failed"); setFiles((p) => p.filter((f) => f.id !== id)); } catch (e) { setError((e as Error).message); }
      setDeletingId(null);
    } else { setDeletingId(id); setTimeout(() => setDeletingId(null), 4000); }
  }
  async function openViewer(file: FileInfo) {
    setViewingFile(file); setFileContent(null);
    try { const r = await fetch(`${location.origin}/file/${file.filename}`); setFileContent(await r.text()); } catch { setFileContent("Failed to load file."); }
  }
  async function handleTogglePublic(id: number, isPublic: boolean) {
    try {
      await api(`/file/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: isPublic }),
      });
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, is_public: isPublic ? 1 : 0 } : f));
    } catch { /* */ }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="w-full max-w-2xl pt-12 pb-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-2xl font-semibold tracking-tight">📁 ShareIT</h1><p className="text-zinc-500 text-sm mt-1">Upload & share files instantly</p></div>
          {user && (<div className="flex items-center gap-2"><span className="text-sm text-zinc-400">👤 {user.username}</span>{user.isAdmin && <button onClick={() => router.push("/admin")} className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">🛡️ Admin</button>}<button onClick={() => router.push("/settings")} className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">⚙️ Settings</button><button onClick={logout} className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">Logout</button></div>)}
        </div>
      </header>

      <UploadZone uploading={uploading} uploadProgress={uploadProgress} dragOver={dragOver} error={error} expireDays={expireDays} onExpireChange={setExpireDays} fileInputRef={fileInputRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onFileChange={handleFileChange} />

      <div className="w-full max-w-2xl px-4 pb-16 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") fetchFiles(1, search); }}
            placeholder="Search files..."
            className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); fetchFiles(1, ""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
          )}
        </div>
        {imageFiles.length > 0 && <ImageGallery images={imageFiles} copiedId={copiedId} deletingId={deletingId} onCopyLink={copyLink} onDelete={handleDelete} onTogglePublic={handleTogglePublic} onOpenLightbox={setLightboxIndex} />}
        {(() => {
          const others = files.filter((f) => !isImage(f.mime_type));
          return others.length > 0 ? <FileList files={others} copiedId={copiedId} deletingId={deletingId} onCopyLink={copyLink} onDelete={handleDelete} onTogglePublic={handleTogglePublic} onOpenViewer={openViewer} /> : null;
        })()}
        {files.length === 0 && <p className="text-sm text-zinc-600">No files uploaded yet.</p>}

        {fileTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => fetchFiles(filePage - 1, search)} disabled={filePage <= 1} className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
            <span className="text-xs text-zinc-500">Page {filePage} of {fileTotalPages}<span className="text-zinc-600 ml-1">({fileTotal} files)</span></span>
            <button onClick={() => fetchFiles(filePage + 1, search)} disabled={filePage >= fileTotalPages} className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
          </div>
        )}
      </div>

      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox image={imageFiles[lightboxIndex]} index={lightboxIndex} total={imageFiles.length}
          hasPrev={lightboxIndex > 0} hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId} deletingId={deletingId}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(imageFiles.length - 1, (i ?? 0) + 1))}
          onCopyLink={copyLink} onDelete={handleDelete} />
      )}

      {viewingFile && <TextViewer file={viewingFile} content={fileContent} copiedId={copiedId} onClose={() => { setViewingFile(null); setFileContent(null); }} onCopyLink={copyLink} />}
    </div>
  );
}
