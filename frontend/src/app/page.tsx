"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isImage, isText } from "../lib/utils";
import type { FileInfo, FilePage, UserInfo } from "../lib/types";
import { LoginForm } from "../components/LoginForm";
import { UploadZone } from "../components/UploadZone";
import { ImageGallery } from "../components/ImageGallery";
import { FileList } from "../components/FileList";
import { Lightbox } from "../components/Lightbox";
import { TextViewer } from "../components/TextViewer";
import { SettingsPage } from "../components/SettingsPage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filePage, setFilePage] = useState(1);
  const [fileTotalPages, setFileTotalPages] = useState(0);
  const [fileTotal, setFileTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageFiles = files.filter((f) => isImage(f.mime_type));

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiFetch(path: string, options?: RequestInit) {
    return fetch(`${API}${path}`, { ...options, headers: { ...authHeaders(), ...(options?.headers || {}) } });
  }

  // Init
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const saved = localStorage.getItem("shareit_token"); if (saved) setToken(saved); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!token) { setUser(null); return; }
    let cancelled = false;
    apiFetch("/auth/me").then(async (r) => {
      if (cancelled) return;
      if (r.ok) { setUser((await r.json()).user); }
      else { localStorage.removeItem("shareit_token"); setToken(null); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keyboard
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

  // Files
  const fetchFiles = useCallback(async (page = 1) => {
    if (!user) return;
    try {
      const r = await apiFetch(`/files?page=${page}&limit=50`);
      if (r.ok) {
        const d: FilePage = await r.json();
        setFiles(d.files);
        setFilePage(d.page);
        setFileTotalPages(d.totalPages);
        setFileTotal(d.total);
      }
    } catch { /* */ }
  }, [user]);
  useEffect(() => { fetchFiles(1); }, [fetchFiles]);

  // Auth
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthError(null);
    try {
      const r = await fetch(`${API}/auth/${authMode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: authUser, password: authPass }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setToken(d.token); setUser(d.user); localStorage.setItem("shareit_token", d.token); setAuthUser(""); setAuthPass("");
    } catch (e) { setAuthError((e as Error).message); }
  }
  function logout() { setToken(null); setUser(null); localStorage.removeItem("shareit_token"); setFiles([]); }

  // Upload
  async function uploadFile(file: File) {
    setUploading(true); setError(null);
    try {
      const f = new FormData(); f.append("file", file);
      const r = await apiFetch("/upload", { method: "POST", body: f });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Upload failed");
      await fetchFiles(1);
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }

  // Actions
  async function copyLink(filename: string, id: number) { await navigator.clipboard.writeText(`${API}/file/${filename}`); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
  async function handleDelete(id: number) {
    if (deletingId === id) {
      try { const r = await apiFetch(`/file/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Delete failed"); setFiles((p) => p.filter((f) => f.id !== id)); } catch (e) { setError((e as Error).message); }
      setDeletingId(null);
    } else { setDeletingId(id); setTimeout(() => setDeletingId(null), 4000); }
  }
  async function openViewer(file: FileInfo) {
    setViewingFile(file); setFileContent(null);
    try { const r = await fetch(`${API}/file/${file.filename}`); setFileContent(await r.text()); } catch { setFileContent("Failed to load file."); }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="w-full max-w-2xl pt-12 pb-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-2xl font-semibold tracking-tight">📁 ShareIT</h1><p className="text-zinc-500 text-sm mt-1">Upload & share files instantly</p></div>
          {user && (<div className="flex items-center gap-3"><span className="text-sm text-zinc-400">👤 {user.username}</span><button onClick={() => setShowSettings(true)} className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">⚙️ Settings</button><button onClick={logout} className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">Logout</button></div>)}
        </div>
      </header>

      {!user ? (
        <LoginForm mode={authMode} username={authUser} password={authPass} error={authError} onModeChange={setAuthMode} onUsernameChange={setAuthUser} onPasswordChange={setAuthPass} onSubmit={handleAuth} />
      ) : showSettings ? (
        <SettingsPage token={token!} user={user!} apiFetch={apiFetch} onBack={() => setShowSettings(false)} />
      ) : (
        <>
          <UploadZone uploading={uploading} dragOver={dragOver} error={error} fileInputRef={fileInputRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onFileChange={handleFileChange} />

          <div className="w-full max-w-2xl px-4 pb-16 space-y-8">
            {imageFiles.length > 0 && <ImageGallery images={imageFiles} copiedId={copiedId} deletingId={deletingId} onCopyLink={copyLink} onDelete={handleDelete} onOpenLightbox={setLightboxIndex} />}
            {(() => {
              const others = files.filter((f) => !isImage(f.mime_type));
              return others.length > 0 ? <FileList files={others} copiedId={copiedId} deletingId={deletingId} onCopyLink={copyLink} onDelete={handleDelete} onOpenViewer={openViewer} /> : null;
            })()}
            {files.length === 0 && <p className="text-sm text-zinc-600">No files uploaded yet.</p>}

            {fileTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => fetchFiles(filePage - 1)}
                  disabled={filePage <= 1}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-zinc-500">
                  Page {filePage} of {fileTotalPages}
                  <span className="text-zinc-600 ml-1">({fileTotal} files)</span>
                </span>
                <button
                  onClick={() => fetchFiles(filePage + 1)}
                  disabled={filePage >= fileTotalPages}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
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
        </>
      )}
    </div>
  );
}
