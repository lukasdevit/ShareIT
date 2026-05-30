'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFileList } from '@/hooks/useFileList';
import { useFileActions } from '@/hooks/useFileActions';
import { useFileViewer } from '@/hooks/useFileViewer';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { UploadZone } from '@/components/files/UploadZone';
import { ImageGallery } from '@/components/files/ImageGallery';
import { FileSection } from '@/components/files/FileSection';
import { Lightbox } from '@/components/files/Lightbox';
import { TextViewer } from '@/components/files/TextViewer';
import { VideoViewer } from '@/components/files/VideoViewer';
import { AudioPlayerBar } from '@/components/files/AudioPlayerBar';
import { isVideo } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { StorageBar } from '@/components/files/StorageBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/DashboardProvider';
import type { FilesViewMode } from '@/features/dashboard/DashboardProvider';
import type { StorageInfo } from '@/types';

const PAGE_SIZE = 9;

export function FilesPanel() {
  const { user, api, token } = useAuth();
  const { filesViewMode, setFilesViewMode } = useDashboard();
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  // ── Data hooks ──
  const {
    files, page: filePage, totalPages: fileTotalPages, total: fileTotal,
    imageFiles, imagePage, imageTotalPages, imageTotal,
    audioFiles, audioPage, audioTotalPages, audioTotal,
    videoFiles, videoPage, videoTotalPages, videoTotal,
    search, searchRef, fetchFiles, setSearch,
  } = useFileList(api, { pageSize: PAGE_SIZE });

  const { copiedId, deletingId, deleteFile, togglePublic, copyLink } = useFileActions(api);
  const {
    lightboxIndex, viewingFile, fileContent,
    openViewer, closeViewer, openLightbox, closeLightbox,
  } = useFileViewer();
  const {
    currentAudio, isPlaying, audioRef,
    play, pause, resume, close: closeAudio,
  } = useAudioPlayer();

  // ── Callbacks ──
  const refreshList = useCallback(
    () => fetchFiles(filesViewMode, 1, searchRef.current),
    [fetchFiles, filesViewMode, searchRef]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (currentAudio?.id === id) closeAudio();
      await deleteFile(id, refreshList);
    },
    [currentAudio, closeAudio, deleteFile, refreshList]
  );

  const playRandomAudio = useCallback(async () => {
    try {
      const res = await api('/files/random?type=audio');
      if (res.ok) {
        const json = await res.json();
        if (json.data) play(json.data);
      }
    } catch { /* ignore */ }
  }, [api, play]);

  const goToPage = useCallback(
    (type: FilesViewMode, page: number) => fetchFiles(type, page, search),
    [fetchFiles, search]
  );

  // ── Effects ──
  useEffect(() => {
    fetchFiles(filesViewMode, 1, search);
  }, [fetchFiles, filesViewMode, search]);

  useEffect(() => {
    api('/auth/storage').then(r => r.json()).then(setStorage).catch(() => {});
  }, [api]);

  useKeyboardShortcuts(
    { lightboxIndex, imageCount: imageFiles.length, closeLightbox, openLightbox },
    { viewingFile, closeViewer },
    currentAudio ? { currentAudio, isPlaying, audioRef, pause, resume } : null
  );

  // ── Visibility ──
  const show = (mode: FilesViewMode) => filesViewMode === mode || filesViewMode === 'all';
  const anyContent = imageFiles.length || files.length || audioFiles.length || videoFiles.length;
  const isEmpty = !anyContent && !search;

  const sectionProps = {
    copiedId, deletingId,
    filesViewMode,
    search,
    onCopyLink: copyLink,
    onTogglePublic: (id: number, isPublic: boolean) => togglePublic(id, isPublic, refreshList),
    onDelete: handleDelete,
    onOpenViewer: openViewer,
    onPlayAudio: play,
  } as const;

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {user?.isDemo && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-xs text-amber-400">
            🎭 Demo session — files are deleted when you close this tab. Storage limit: 100 MB.
          </span>
        </div>
      )}

      {storage && <StorageBar used={storage.used} limit={storage.limit} />}

      <UploadZone
        s3Enabled={storage?.s3_upload_enabled ?? false}
        token={token}
        onUploadComplete={refreshList}
      />

      <div className={`w-full max-w-4xl xl:max-w-6xl mx-auto px-4 space-y-4 ${currentAudio ? 'pb-24' : 'pb-16'}`}>
        {/* Tabs + Search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {(['all', 'images', 'audio', 'video', 'file'] as FilesViewMode[]).map(m => (
              <button
                type="button" key={m}
                onClick={() => setFilesViewMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${filesViewMode === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchFiles(filesViewMode, 1, search); }}
              placeholder="Search files..." aria-label="Search files"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); fetchFiles(filesViewMode, 1, ''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isEmpty && (
          <EmptyState icon="☁️" title="No files yet" description="Drop a file above or click the upload zone to get started." />
        )}

        {/* Images */}
        {show('images') && imageFiles.length > 0 && (
          <>
            {filesViewMode === 'all' && (
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Images ({imageTotal})</h2>
            )}
            <ImageGallery
              images={imageFiles} total={imageTotal}
              copiedId={copiedId} deletingId={deletingId}
              onCopyLink={copyLink}
              onDelete={handleDelete}
              onTogglePublic={(id, isPublic) => togglePublic(id, isPublic, refreshList)}
              onOpenLightbox={openLightbox}
            />
            {imageTotalPages > 1 && (
              <Pagination
                page={imagePage} totalPages={imageTotalPages} total={imageTotal}
                onPrev={() => goToPage(filesViewMode, imagePage - 1)}
                onNext={() => goToPage(filesViewMode, imagePage + 1)}
                label="Images"
              />
            )}
          </>
        )}

        {/* Audio / Video / Files — reusable FileSection */}
        <FileSection
          {...sectionProps}
          label="Audio" files={audioFiles} total={audioTotal}
          page={audioPage} totalPages={audioTotalPages}
          currentAudioId={currentAudio?.id ?? null}
          showDivider={filesViewMode === 'all' && (imageFiles.length > 0 || videoFiles.length > 0)}
          onPageChange={p => goToPage(filesViewMode, p)}
        />
        <FileSection
          {...sectionProps}
          label="Video" files={videoFiles} total={videoTotal}
          page={videoPage} totalPages={videoTotalPages}
          currentAudioId={null}
          showDivider={filesViewMode === 'all' && (imageFiles.length > 0 || audioFiles.length > 0)}
          onPageChange={p => goToPage(filesViewMode, p)}
        />
        <FileSection
          {...sectionProps}
          label="Files" files={files} total={fileTotal}
          page={filePage} totalPages={fileTotalPages}
          currentAudioId={currentAudio?.id ?? null}
          showDivider={filesViewMode === 'all' && anyContent > 0}
          onPageChange={p => goToPage(filesViewMode, p)}
        />

        {search && !anyContent && (
          <EmptyState icon="🔍" title="No results" description={`No files matching "${search}"`} />
        )}
      </div>

      {/* Modals */}
      {lightboxIndex !== null && lightboxIndex < imageFiles.length && (
        <Lightbox
          image={imageFiles[lightboxIndex]!}
          index={lightboxIndex} total={imageFiles.length}
          hasPrev={lightboxIndex > 0} hasNext={lightboxIndex < imageFiles.length - 1}
          copiedId={copiedId} deletingId={deletingId}
          onClose={closeLightbox}
          onPrev={() => openLightbox(lightboxIndex - 1)}
          onNext={() => openLightbox(lightboxIndex + 1)}
          onCopyLink={copyLink}
          onDelete={handleDelete}
          onTogglePublic={(id, isPublic) => togglePublic(id, isPublic, refreshList)}
        />
      )}

      {viewingFile && (
        isVideo(viewingFile.mime_type) ? (
          <VideoViewer
            file={viewingFile} copiedId={copiedId} deletingId={deletingId}
            onClose={closeViewer} onCopyLink={copyLink} onDelete={handleDelete}
          />
        ) : (
          <TextViewer
            file={viewingFile} content={fileContent}
            copiedId={copiedId} deletingId={deletingId}
            onClose={closeViewer} onCopyLink={copyLink} onDelete={handleDelete}
          />
        )
      )}

      <AudioPlayerBar
        currentAudio={currentAudio} isPlaying={isPlaying} audioRef={audioRef}
        copiedId={copiedId} deletingId={deletingId}
        onPlayPause={isPlaying ? pause : resume}
        onNext={playRandomAudio}
        onClose={closeAudio}
        onDelete={handleDelete}
        onCopyLink={copyLink}
      />
    </div>
  );
}
