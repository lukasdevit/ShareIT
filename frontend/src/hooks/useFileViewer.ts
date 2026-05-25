"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import type { FileInfo } from "@/lib/types";

/**
 * Hook for viewing file contents (text files) and managing lightbox state.
 */
export function useFileViewer() {
  const { api } = useAuth();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const openViewer = useCallback(async (file: FileInfo) => {
    setViewingFile(file);
    setFileContent(null);
    try {
      const r = await fetch(`/file/${file.filename}`);
      if (r.ok) setFileContent(await r.text());
      else setFileContent("[Failed to load file content]");
    } catch {
      setFileContent("[Network error]");
    }
  }, []);

  const closeViewer = useCallback(() => {
    setViewingFile(null);
    setFileContent(null);
  }, []);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  return {
    lightboxIndex, viewingFile, fileContent,
    openViewer, closeViewer, openLightbox, closeLightbox,
  };
}
