"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useFiles } from "../../hooks/useFiles";
import { useFileViewer } from "../../hooks/useFileViewer";
import { UploadZone } from "../../components/UploadZone";
import { ImageGallery } from "../../components/ImageGallery";
import { FileList } from "../../components/FileList";
import { Lightbox } from "../../components/Lightbox";
import { TextViewer } from "../../components/TextViewer";

export default function FilesPage() {
  const { logout } = useAuth();
  const { isReady, user } = useRequireAuth();
  const router = useRouter();

  const {
    files, page: filePage, totalPages: fileTotalPages, total: fileTotal,
    imageFiles, imagePage, imageTotalPages, imageTotal,
    uploading, uploadProgress, dragOver, error, copiedId, deletingId,
    search, expireDays, fileInputRef,
    fetchFiles, uploadFile, deleteFile, togglePublic, copyLink,
    setSearch, setExpireDays, setDragOver, handleDrop,
  } = useFiles({ pageSize: 9 });

  const {
    lightboxIndex, viewingFile, fileContent,
    openViewer, closeViewer, openLightbox, closeLightbox,
  } = useFileViewer();

  // Fetch files on mount and when search changes
  useEffect(() => { if (isReady) fetchFiles(1, 1, search); }, [fetchFiles, search, isReady]);

  // Keyboard shortcuts for lightbox/viewer
  useEffect(() => {
    if (lightboxIndex === null && viewingFile === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closeLightbox(); closeViewer(); }
      if (lightboxIndex !== null) {
        if (e.key === "ArrowLeft") openLightbox(Math.max(0, lightboxIndex - 1));
        if (e.key === "ArrowRight") openLightbox(Math.min(imageFiles.length - 1, lightboxIndex + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, viewingFile, imageFiles.length, closeLightbox, closeViewer, openLightbox]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    e.target.value = "";
  }

  if (!isReady) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="w-full max-w-2xl pt-12 pb-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">📁 ShareIT</h1>
            <p className="text-zinc-500 text-sm mt-1">Upload & share files instantly</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">👤 {user.username}</span>
            {user.isAdmin && (
              <button onClick={() => router.push("/admin")}
                className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                🛡️ Admin
              </button>
            )}
            <button onClick={() => router.push("/settings")}
              className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              ⚙️ Settings
            </button>
            <button onClick={logout}
              className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Upload zone */}
      <UploadZone
        uploading={uploading} uploadProgress={uploadProgress}
        dragOver={dragOver} error={error} expireDays={expireDays}
        onExpireChange={setExpireDays} fileInputRef={fileInputRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />

      {/* File list */}
      <div className="w-full max-w-2xl px-4 pb-16 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchFiles(1, 1, search); }}
            placeholder="Search files..."
            className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); fetchFiles(1, 1, ""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">
              ✕
            </button>
          )}
        </div>

        {/* Images section */}
        {imageFiles.length > 0 && (
          <>
            <ImageGallery images={imageFiles} total={imageTotal} copiedId={copiedId} deletingId={deletingId}
              onCopyLink={copyLink} onDelete={deleteFile} onTogglePublic={togglePublic}
              onOpenLightbox={openLightbox} />
            {imageTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => fetchFiles(filePage, imagePage - 1, search)} disabled={imagePage <= 1}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                <span className="text-xs text-zinc-500">
                  Images — Page {imagePage} of {imageTotalPages}
                  <span className="text-zinc-600 ml-1">({imageTotal} total)</span>
                </span>
                <button onClick={() => fetchFiles(filePage, imagePage + 1, search)} disabled={imagePage >= imageTotalPages}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            )}
            <hr className="border-zinc-800" />
          </>
        )}

        {/* Files section */}
        {files.length > 0 ? (
          <FileList files={files} total={fileTotal} copiedId={copiedId}
            onCopyLink={copyLink} onTogglePublic={togglePublic}
            onOpenViewer={openViewer} />
        ) : (
          !imageFiles.length && <p className="text-sm text-zinc-600">No files uploaded yet.</p>
        )}

        {/* Files pagination */}
        {fileTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => fetchFiles(filePage - 1, imagePage, search)} disabled={filePage <= 1}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <span className="text-xs text-zinc-500">
              Files — Page {filePage} of {fileTotalPages}
              <span className="text-zinc-600 ml-1">({fileTotal} total)</span>
            </span>
            <button onClick={() => fetchFiles(filePage + 1, imagePage, search)} disabled={filePage >= fileTotalPages}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox image={imageFiles[lightboxIndex]} index={lightboxIndex} total={imageFiles.length}
          hasPrev={lightboxIndex > 0} hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId} deletingId={deletingId}
          onClose={closeLightbox}
          onPrev={() => openLightbox(Math.max(0, lightboxIndex - 1))}
          onNext={() => openLightbox(Math.min(imageFiles.length - 1, lightboxIndex + 1))}
          onCopyLink={copyLink} onDelete={deleteFile} />
      )}

      {/* Text viewer */}
      {viewingFile && (
        <TextViewer file={viewingFile} content={fileContent}
          copiedId={copiedId} deletingId={deletingId}
          onClose={closeViewer} onCopyLink={copyLink}
          onDelete={deleteFile} />
      )}
    </div>
  );
}
