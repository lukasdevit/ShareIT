'use client';

import { useState, useCallback, useRef } from 'react';
import { API_BASE } from '@/lib/api-client';

/**
 * Hook for file upload with XHR progress tracking and drag-and-drop support.
 */
export function useFileUpload(
  api: (path: string, options?: RequestInit) => Promise<Response>,
  token: string | null
) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expireDays, setExpireDays] = useState('');

  const uploadFile = useCallback(
    async (
      fileOrFiles: File | File[],
      onSuccess: () => Promise<void>,
      expireDaysOverride?: string
    ) => {
      const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      if (files.length === 0) return;

      setUploading(true);
      setUploadProgress(0);
      setUploadCount({ done: 0, total: files.length });
      setError(null);

      const expiry = expireDaysOverride ?? expireDays;

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const form = new FormData();
        form.append('file', file);

        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100));
              }
            });
            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else {
                try {
                  const d = JSON.parse(xhr.responseText);
                  reject(new Error(d.error || 'Upload failed'));
                } catch {
                  reject(new Error('Upload failed'));
                }
              }
            });
            xhr.addEventListener('error', () =>
              reject(new Error('Network error'))
            );

            let url = `${API_BASE}/upload`;
            if (expiry) url += `?expires=${expiry}`;
            xhr.open('POST', url);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('X-File-Expires', expiry);
            xhr.send(form);
          });
        } catch (err) {
          setError(`${file.name}: ${(err as Error).message}`);
          setUploading(false);
          return;
        }

        setUploadCount({ done: i + 1, total: files.length });
      }

      setUploading(false);
      await onSuccess();
    },
    [token, expireDays]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, onSuccess: () => Promise<void>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFile(Array.from(e.dataTransfer.files), onSuccess);
      }
    },
    [uploadFile]
  );

  return {
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
    setError,
    setExpireDays,
  };
}
