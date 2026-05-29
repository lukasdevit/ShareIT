'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-client';

// Uppy is dynamically required to avoid SSR issues (browser-only).

interface Props {
  token: string | null;
  onUploadComplete: () => Promise<void>;
}

export function S3UploadZone({ token, onUploadComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uppyRef = useRef<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expireDays, setExpireDays] = useState('');

  const authHeaders = useCallback(
    (): Record<string, string> =>
      token ? { Authorization: `Bearer ${token}` } : {},
    [token]
  );

  const createUppy = useCallback(() => {
    const { Uppy } = require('@uppy/core');
    const { default: DragDrop } = require('@uppy/drag-drop');
    const { default: AwsS3Multipart } = require('@uppy/aws-s3');

    const uppy = new Uppy({
      restrictions: { maxFileSize: 5 * 1024 * 1024 * 1024 },
      onBeforeFileAdded: (file: any) => {
        file.meta = {
          ...file.meta,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
        };
        return true;
      },
    });

    uppy.use(DragDrop, { target: containerRef.current! });

    uppy.use(AwsS3Multipart, {
      shouldUseMultipart: true,
      companionHeaders: authHeaders(),
      createMultipartUpload: async (file: any) => {
        const res = await fetch(`${API_BASE}/upload/s3/multipart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { uploadId: json.data.uploadId, key: json.data.key };
      },
      signPart: async (_file: any, opts: any) => {
        const { uploadId, key, partNumber } = opts;
        const res = await fetch(
          `${API_BASE}/upload/s3/multipart/${encodeURIComponent(key)}/${uploadId}/${partNumber}`,
          { headers: authHeaders() }
        );
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { url: json.data.url };
      },
      listParts: async () => [],
      completeMultipartUpload: async (file: any, opts: any) => {
        const { uploadId, key, parts } = opts;
        const res = await fetch(
          `${API_BASE}/upload/s3/multipart/${encodeURIComponent(key)}/${uploadId}/complete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
            body: JSON.stringify({
              parts: (parts as any[]).map((p: any) => ({
                PartNumber: p.PartNumber,
                ETag: p.ETag,
              })),
              originalName: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              expiresInDays: expireDays
                ? parseInt(expireDays, 10)
                : undefined,
            }),
          }
        );
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { location: json.data.url };
      },
      abortMultipartUpload: async (_file: any, opts: any) => {
        const { uploadId, key } = opts;
        await fetch(
          `${API_BASE}/upload/s3/multipart/${encodeURIComponent(key)}/${uploadId}`,
          { method: 'DELETE', headers: authHeaders() }
        );
      },
    });

    uppy.on('progress', (pct: number) => setProgress(pct));
    uppy.on('upload', () => {
      setUploading(true);
      setError(null);
    });
    uppy.on('complete', () => {
      setUploading(false);
      onUploadComplete();
    });
    uppy.on('error', (err: any) => {
      setError((err as Error).message);
      setUploading(false);
    });
    uppy.on('drag-over', () => setDragOver(true));
    uppy.on('drag-leave', () => setDragOver(false));

    return uppy;
  }, [authHeaders, expireDays, onUploadComplete]);

  // Initialize Uppy once
  useEffect(() => {
    uppyRef.current = createUppy();
    return () => {
      uppyRef.current?.close({ reason: 'unmount' });
      uppyRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update token on the running instance
  useEffect(() => {
    if (!uppyRef.current) return;
    const plugin = uppyRef.current.getPlugin('AwsS3Multipart') as any;
    if (plugin?.setOptions) {
      plugin.setOptions({ companionHeaders: authHeaders() });
    }
  }, [token, authHeaders]);

  return (
    <div className="w-full max-w-2xl px-4 mb-8">
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        className={`relative flex flex-col items-center justify-center h-40 rounded-xl border-2 cursor-pointer transition-all select-none overflow-hidden pb-8 ${
          dragOver
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-48">
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {progress < 100
                ? `Uploading... ${progress}%`
                : 'Processing...'}
            </span>
          </div>
        ) : (
          <>
            <svg
              className="w-20 h-16 mb-3 text-blue-500/50"
              viewBox="0 0 80 60"
              fill="currentColor"
            >
              <path
                d="M16 46c-6.63 0-12-5.37-12-12s5.37-12 12-12c1.6-5.6 7-9.6 13.2-9.6 5.8 0 10.8 3.4 12.8 8.4 3.6-1.6 7.6-2.4 12-2.4 8.8 0 16 7.2 16 16s-7.2 16-16 16H16z"
                opacity="0.25"
              />
              <path
                d="M28 38l12 10 12-10M40 48V26"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-sm text-zinc-400">
              Drop a file here or click to browse
            </span>
            <span className="text-xs text-zinc-600 mt-1">
              Multipart upload direct to storage
            </span>
          </>
        )}

        {/* Expiration selector */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800/50 border-t border-zinc-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] text-zinc-500 whitespace-nowrap">
            ⏱️ Auto-delete:
          </span>
          <select
            value={expireDays}
            onChange={(e) => setExpireDays(e.target.value)}
            className="bg-transparent text-zinc-400 text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="">Never</option>
            <option value="1">After 1 day</option>
            <option value="7">After 7 days</option>
            <option value="30">After 30 days</option>
            <option value="90">After 90 days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
