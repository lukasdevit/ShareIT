'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Hook for file actions: delete (with confirmation), toggle public, and copy link.
 */
export function useFileActions(
  api: (path: string, options?: RequestInit) => Promise<Response>
) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [_deletingId, _setDeletingId] = useState<number | null>(null);
  const deletingIdRef = useRef<number | null>(null);

  const setDeletingId = (id: number | null) => {
    deletingIdRef.current = id;
    _setDeletingId(id);
  };

  const deleteFile = useCallback(
    async (id: number, onSuccess: () => Promise<void>) => {
      if (deletingIdRef.current === id) {
        setDeletingId(null);
        await api(`/file/${id}`, { method: 'DELETE' });
        await onSuccess();
      } else {
        setDeletingId(id);
      }
    },
    [api]
  );

  const togglePublic = useCallback(
    async (id: number, isPublic: boolean, onSuccess: () => Promise<void>) => {
      await api(`/file/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: isPublic }),
      });
      await onSuccess();
    },
    [api]
  );

  const copyLink = useCallback((filename: string, id: number) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${base}/file/${filename}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return {
    copiedId,
    deletingId: _deletingId,
    deleteFile,
    togglePublic,
    copyLink,
  };
}
