"use client";

import { useEffect, useState } from "react";
import { useFiles } from "../hooks/useFiles";
import { useFileViewer } from "../hooks/useFileViewer";
import { UploadZone } from "./UploadZone";
import { ImageGallery } from "./ImageGallery";
import { FileList } from "./FileList";
import { Lightbox } from "./Lightbox";
import { TextViewer } from "./TextViewer";
import { EmptyState } from "./EmptyState";
import { useAuth } from "../lib/auth-context";
import { useDashboard } from "../context/DashboardContext";
import type { FilesViewMode } from "../context/DashboardContext";
import { formatSize } from "../lib/utils";

export function FilesPanel() {
  const { user, api } = useAuth();
  const { filesViewMode, setFilesViewMode } = useDashboard();
  const [storage, setStorage] = useState<{ used: number; limit: number } | null>(null);

  const {
    files, page: filePage, totalPages: fileTotalPages, total: fileTotal,
    imageFiles, imagePage, imageTotalPages, imageTotal,
    uploading, uploadProgress, uploadCount, dragOver, error, copiedId, deletingId,
    search, expireDays, fileInputRef,
    fetchFiles, uploadFile, deleteFile, togglePublic, copyLink,
    setSearch, setExpireDays, setDragOver, handleDrop,
  } = useFiles({ pageSize: 9 });

  const {
    lightboxIndex, viewingFile, fileContent,
    openViewer, closeViewer, openLightbox, closeLightbox,
  } = useFileViewer();

  useEffect(() => { fetchFiles(1, 1, search); }, [fetchFiles, search]);
  useEffect(() => {
    api("/auth/storage").then((r) => r.json()).then(setStorage).catch(() => {});
  }, [api]);

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
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      uploadFile(Array.from(fileList));
    }
    e.target.value = "";
  }

  const usagePercent = storage ? Math.min(100, (storage.used / storage.limit) * 100) : 0;
  const showImages = filesViewMode === "images" || filesViewMode === "all";
  const showFiles = filesViewMode === "files" || filesViewMode === "all";
  const isEmpty = !imageFiles.length && !files.length && !search;

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Demo banner */}
      {user?.isDemo && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-xs text-amber-400">
            🎭 Demo session — files are deleted when you close this tab. Storage limit: 100 MB.
          </span>
        </div>
      )}

      {/* Storage bar */}
      {storage && (
        <div className="w-full max-w-4xl xl:max-w-6xl mx-auto px-4 pt-6 pb-2">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{formatSize(storage.used)} of {formatSize(storage.limit)}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent > 90 ? "#ef4444" : usagePercent > 70 ? "#f59e0b" : "#3b82f6",
                }}
              />
            </div>
            <span>{usagePercent.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <UploadZone
        uploading={uploading} uploadProgress={uploadProgress} uploadCount={uploadCount}
        dragOver={dragOver} error={error} expireDays={expireDays}
        onExpireChange={setExpireDays} fileInputRef={fileInputRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />

      {/* Content area */}
      <div className="w-full max-w-4xl xl:max-w-6xl mx-auto px-4 pb-16 space-y-4">
        {/* Tabs + Search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {(["all", "images", "files"] as FilesViewMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setFilesViewMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  filesViewMode === m ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fetchFiles(1, 1, search); }}
              placeholder="Search files..."
              aria-label="Search files"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(""); fetchFiles(1, 1, ""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {isEmpty && !uploading && (
          <EmptyState
            icon="☁️"
            title="No files yet"
            description="Drop a file above or click the upload zone to get started."
          />
        )}

        {/* Images */}
        {showImages && imageFiles.length > 0 && (
          <>
            {filesViewMode === "all" && <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Images ({imageTotal})</h2>}
            <ImageGallery images={imageFiles} total={imageTotal} copiedId={copiedId} deletingId={deletingId}
              onCopyLink={copyLink} onDelete={deleteFile} onTogglePublic={togglePublic}
              onOpenLightbox={openLightbox} />
            {imageTotalPages > 1 && (
              <Pagination page={imagePage} totalPages={imageTotalPages} total={imageTotal}
                onPrev={() => fetchFiles(filePage, imagePage - 1, search)}
                onNext={() => fetchFiles(filePage, imagePage + 1, search)} label="Images" />
            )}
          </>
        )}

        {/* Files */}
        {showFiles && files.length > 0 && (
          <>
            {filesViewMode === "all" && imageFiles.length > 0 && <hr className="border-zinc-800" />}
            {filesViewMode === "all" && <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Files ({fileTotal})</h2>}
            <FileList files={files} total={fileTotal} copiedId={copiedId} deletingId={deletingId}
              onCopyLink={copyLink} onTogglePublic={togglePublic} onDelete={deleteFile}
              onOpenViewer={openViewer} />
            {fileTotalPages > 1 && (
              <Pagination page={filePage} totalPages={fileTotalPages} total={fileTotal}
                onPrev={() => fetchFiles(filePage - 1, imagePage, search)}
                onNext={() => fetchFiles(filePage + 1, imagePage, search)} label="Files" />
            )}
          </>
        )}

        {/* Search empty */}
        {search && !imageFiles.length && !files.length && !uploading && (
          <EmptyState icon="🔍" title="No results" description={`No files matching "${search}"`} />
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox image={imageFiles[lightboxIndex]!} index={lightboxIndex} total={imageFiles.length}
          hasPrev={lightboxIndex > 0} hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId} deletingId={deletingId}
          onClose={closeLightbox} onPrev={() => openLightbox(lightboxIndex - 1)}
          onNext={() => openLightbox(lightboxIndex + 1)}
          onCopyLink={copyLink} onDelete={deleteFile} onTogglePublic={togglePublic} />
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

function Pagination({ page, totalPages, total, label, onPrev, onNext }: {
  page: number; totalPages: number; total: number; label: string;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button type="button" onClick={onPrev} disabled={page <= 1}
        className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
      <span className="text-xs text-zinc-500">
        {label} — Page {page} of {totalPages}
        <span className="text-zinc-600 ml-1">({total} total)</span>
      </span>
      <button type="button" onClick={onNext} disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
    </div>
  );
}
