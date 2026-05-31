'use client';

import { useEffect, type RefObject } from 'react';

interface LightboxHandlers {
  lightboxIndex: number | null;
  imageCount: number;
  closeLightbox: () => void;
  openLightbox: (index: number) => void;
}

interface AudioHandlers {
  currentAudio: unknown;
  isPlaying: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  pause: () => void;
  resume: () => void;
}

interface ViewerHandlers {
  viewingFile: unknown;
  closeViewer: () => void;
}

/**
 * Centralized keyboard shortcuts for lightbox navigation, viewer close,
 * and audio player controls.
 */
export function useKeyboardShortcuts(
  lightbox: LightboxHandlers,
  viewer: ViewerHandlers,
  audio: AudioHandlers | null // null when no audio is playing
) {
  // Lightbox arrows + Escape for both lightbox and viewer
  useEffect(() => {
    if (lightbox.lightboxIndex === null && viewer.viewingFile === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        lightbox.closeLightbox();
        viewer.closeViewer();
      }
      if (lightbox.lightboxIndex !== null) {
        if (e.key === 'ArrowLeft') lightbox.openLightbox(Math.max(0, lightbox.lightboxIndex - 1));
        if (e.key === 'ArrowRight')
          lightbox.openLightbox(Math.min(lightbox.imageCount - 1, lightbox.lightboxIndex + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, viewer]);

  // Audio player: Space, arrows, M (only when no input focused)
  useEffect(() => {
    if (!audio?.currentAudio) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const el = audio!.audioRef.current;
      if (e.key === ' ') {
        e.preventDefault();
        if (audio!.isPlaying) audio!.pause();
        else audio!.resume();
      }
      if (e.key === 'ArrowLeft' && el) {
        e.preventDefault();
        el.currentTime = Math.max(0, el.currentTime - 5);
      }
      if (e.key === 'ArrowRight' && el) {
        e.preventDefault();
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (el) el.muted = !el.muted;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [audio]);
}
