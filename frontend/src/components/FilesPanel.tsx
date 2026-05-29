'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFileList } from '@/hooks/useFileList';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileActions } from '@/hooks/useFileActions';
import { useFileViewer } from '@/hooks/useFileViewer';
import { UploadZone } from '@/components/files/UploadZone';
import { S3UploadZone } from '@/components/files/S3UploadZone';
import { ImageGallery } from '@/components/files/ImageGallery';
import { FileList } from '@/components/files/FileList';
import { Lightbox } from '@/components/files/Lightbox';
import { TextViewer } from '@/components/files/TextViewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { StorageBar } from '@/components/files/StorageBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/DashboardProvider';
import type { FilesViewMode } from '@/features/dashboard/DashboardProvider';

/** Grid density: 9 items per page (3×3) for the image gallery + file list. */
const PAGE_SIZE = 9;

export function FilesPanel() {
  const { user, api, token } = useAuth();
  const { filesViewMode, setFilesViewMode } = useDashboard();
  const [storage, setStorage] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  // ── Data hooks ──
  const {
    files,
    page: filePage,
    totalPages: fileTotalPages,
    total: fileTotal,
    imageFiles,
    imagePage,
    imageTotalPages,
    imageTotal,
    search,
    searchRef,
    fetchFiles,
    setSearch,
  } = useFileList(api, { pageSize: PAGE_SIZE });

  const {
    uploading,
    uploadProgress,
    uploadCount,
    dragOver,
    error,
    expireDays,
    fileInputRef,
    uploadFile,
    handleDrop,
    setDragOver,
    setExpireDays,
  } = useFileUpload(api, token);

  const {
    copiedId,
    deletingId,
    deleteFile,
    togglePublic,
    copyLink,
  } = useFileActions(api);

  const {
    lightboxIndex,
    viewingFile,
    fileContent,
    openViewer,
    closeViewer,
    openLightbox,
    closeLightbox,
  } = useFileViewer();

  // ── Shared callback: refresh file list after mutations ──
  const refreshList = useCallback(
    () => fetchFiles(1, 1, searchRef.current),
    [fetchFiles, searchRef]
  );

  // ── Effects ──
  useEffect(() => {
    fetchFiles(1, 1, search);
  }, [fetchFiles, search]);
  useEffect(() => {
    api('/auth/storage')
      .then((r) => r.json())
      .then(setStorage)
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (lightboxIndex === null && viewingFile === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeLightbox();
        closeViewer();
      }
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowLeft') openLightbox(Math.max(0, lightboxIndex - 1));
        if (e.key === 'ArrowRight')
          openLightbox(Math.min(imageFiles.length - 1, lightboxIndex + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    lightboxIndex,
    viewingFile,
    imageFiles.length,
    closeLightbox,
    closeViewer,
    openLightbox,
  ]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      uploadFile(Array.from(fileList), refreshList);
    }
    e.target.value = '';
  }

  const showImages = filesViewMode === 'images' || filesViewMode === 'all';
  const showFiles = filesViewMode === 'files' || filesViewMode === 'all';
  const isEmpty = !imageFiles.length && !files.length && !search;

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Demo banner */}
      {user?.isDemo && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-xs text-amber-400">
            🎭 Demo session — files are deleted when you close this tab. Storage
            limit: 100 MB.
          </span>
        </div>
      )}

      {/* Storage bar */}
      {storage && <StorageBar used={storage.used} limit={storage.limit} />}

      {/* Upload zone — S3 multipart when B2 is enabled, otherwise legacy XHR */}
      {process.env.NEXT_PUBLIC_S3_UPLOAD_ENABLED === 'true' ? (
        <S3UploadZone token={token} onUploadComplete={refreshList} />
      ) : (
        <UploadZone
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadCount={uploadCount}
          dragOver={dragOver}
          error={error}
          expireDays={expireDays}
          onExpireChange={setExpireDays}
          fileInputRef={fileInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => handleDrop(e, refreshList)}
          onFileChange={handleFileChange}
        />
      )}

      {/* Content area */}
      <div className="w-full max-w-4xl xl:max-w-6xl mx-auto px-4 pb-16 space-y-4">
        {/* Tabs + Search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {(['all', 'images', 'files'] as FilesViewMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setFilesViewMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  filesViewMode === m
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchFiles(1, 1, search);
              }}
              placeholder="Search files..."
              aria-label="Search files"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchFiles(1, 1, '');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
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
            {filesViewMode === 'all' && (
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Images ({imageTotal})
              </h2>
            )}
            <ImageGallery
              images={imageFiles}
              total={imageTotal}
              copiedId={copiedId}
              deletingId={deletingId}
              onCopyLink={copyLink}
              onDelete={(id) => deleteFile(id, refreshList)}
              onTogglePublic={(id, isPublic) => togglePublic(id, isPublic, refreshList)}
              onOpenLightbox={openLightbox}
            />
            {imageTotalPages > 1 && (
              <Pagination
                page={imagePage}
                totalPages={imageTotalPages}
                total={imageTotal}
                onPrev={() => fetchFiles(filePage, imagePage - 1, search)}
                onNext={() => fetchFiles(filePage, imagePage + 1, search)}
                label="Images"
              />
            )}
          </>
        )}

        {/* Files */}
        {showFiles && files.length > 0 && (
          <>
            {filesViewMode === 'all' && imageFiles.length > 0 && (
              <hr className="border-zinc-800" />
            )}
            {filesViewMode === 'all' && (
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Files ({fileTotal})
              </h2>
            )}
            <FileList
              files={files}
              total={fileTotal}
              copiedId={copiedId}
              deletingId={deletingId}
              onCopyLink={copyLink}
              onTogglePublic={(id, isPublic) => togglePublic(id, isPublic, refreshList)}
              onDelete={(id) => deleteFile(id, refreshList)}
              onOpenViewer={openViewer}
            />
            {fileTotalPages > 1 && (
              <Pagination
                page={filePage}
                totalPages={fileTotalPages}
                total={fileTotal}
                onPrev={() => fetchFiles(filePage - 1, imagePage, search)}
                onNext={() => fetchFiles(filePage + 1, imagePage, search)}
                label="Files"
              />
            )}
          </>
        )}

        {/* Search empty */}
        {search && !imageFiles.length && !files.length && !uploading && (
          <EmptyState
            icon="🔍"
            title="No results"
            description={`No files matching "${search}"`}
          />
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox
          image={imageFiles[lightboxIndex]!}
          index={lightboxIndex}
          total={imageFiles.length}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId}
          deletingId={deletingId}
          onClose={closeLightbox}
          onPrev={() => openLightbox(lightboxIndex - 1)}
          onNext={() => openLightbox(lightboxIndex + 1)}
          onCopyLink={copyLink}
          onDelete={(id) => deleteFile(id, refreshList)}
          onTogglePublic={(id, isPublic) => togglePublic(id, isPublic, refreshList)}
        />
      )}

      {/* Text viewer */}
      {viewingFile && (
        <TextViewer
          file={viewingFile}
          content={fileContent}
          copiedId={copiedId}
          deletingId={deletingId}
          onClose={closeViewer}
          onCopyLink={copyLink}
          onDelete={(id) => deleteFile(id, refreshList)}
        />
      )}
    </div>
  );
}
