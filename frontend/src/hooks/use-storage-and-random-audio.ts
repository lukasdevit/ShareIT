'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import type { FileInfo } from '@/types';

export function useStorageAndRandomAudio(playAudio: (file: FileInfo) => void) {
  const { api } = useAuth();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [storage, setStorage] = useState<{ used: number; limit: number; s3_upload_enabled?: boolean } | null>(null);

  useEffect(() => {
    apiRef.current('/auth/storage').then(r => r.json()).then(setStorage).catch(() => {});
  }, []);

  const playRandomAudio = useCallback(async () => {
    try {
      const res = await api('/files/random?type=audio');
      if (res.ok) {
        const json = await res.json();
        if (json.data) playAudio(json.data);
      }
    } catch { /* ignore */ }
  }, [api, playAudio]);

  return { storage, playRandomAudio };
}
