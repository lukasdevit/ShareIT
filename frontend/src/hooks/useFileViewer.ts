'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { isVideo } from '@/lib/utils';
import type { FileInfo } from '@/types';

/**
 * Hook for viewing file contents (text, PDF, video) and managing lightbox state.
 * Audio is handled separately by useAudioPlayer (bottom bar, no modal).
 */
export function useFileViewer() {
  const { api } = useAuth();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const openViewer = useCallback(async (file: FileInfo) => {
    setViewingFile(file);
    // PDF and video don't need content fetched as text
    if (file.mime_type === 'application/pdf' || isVideo(file.mime_type)) {
      setFileContent('');
      return;
    }
    setFileContent(null);
    try {
      const r = await api(`/file/${file.filename}`);
      if (r.ok) setFileContent(await r.text());
      else setFileContent('[Failed to load file content]');
    } catch {
      setFileContent('[Network error]');
    }
  }, [api]);

  const closeViewer = useCallback(() => {
    setViewingFile(null);
    setFileContent(null);
  }, []);

  const openLightbox = useCallback(
    (index: number) => setLightboxIndex(index),
    []
  );
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  return {
    lightboxIndex,
    viewingFile,
    fileContent,
    openViewer,
    closeViewer,
    openLightbox,
    closeLightbox,
  };
}
