'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-client';
import { Uppy } from '@uppy/core';
import AwsS3Multipart from '@uppy/aws-s3';

interface Props {
  s3Enabled: boolean;
  token: string | null;
  onUploadComplete: () => Promise<void>;
}

export function UploadZone({ s3Enabled, token, onUploadComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uppyRef = useRef<Uppy | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expireDays, setExpireDays] = useState('');

  const authHeaders = useCallback(
    (): Record<string, string> =>
      token ? { Authorization: `Bearer ${token}` } : {},
    [token]
  );

  // ── Init Uppy for S3 multipart ──
  useEffect(() => {
    if (!s3Enabled) {
      if (uppyRef.current) {
        uppyRef.current.destroy();
        uppyRef.current = null;
      }
      return;
    }
    if (uppyRef.current) return; // already initialized

    const uppy = new Uppy({
      autoProceed: true,
      restrictions: { maxFileSize: 5 * 1024 * 1024 * 1024 },
      onBeforeFileAdded: (file: any) => {
        file.meta = { ...file.meta, filename: file.name, mimeType: file.type || 'application/octet-stream' };
        return true;
      },
    });

    uppy.use(AwsS3Multipart, {
      shouldUseMultipart: true,
      createMultipartUpload: async (file: any) => {
        const res = await fetch(`${API_BASE}/upload/s3/multipart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ filename: file.name, mimeType: file.type || 'application/octet-stream' }),
        });
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { uploadId: json.data.uploadId, key: json.data.key };
      },
      signPart: async (_file: any, opts: any) => {
        const { uploadId, key, partNumber } = opts;
        const res = await fetch(`${API_BASE}/upload/s3/multipart/sign-part`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ key, uploadId, partNumber }),
        });
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { url: json.data.url };
      },
      listParts: async () => [],
      completeMultipartUpload: async (file: any, opts: any) => {
        const { uploadId, key, parts } = opts;
        const res = await fetch(
          `${API_BASE}/upload/s3/multipart/${encodeURIComponent(uploadId)}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              key,
              parts: (parts as any[]).map((p: any) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
              originalName: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              expiresInDays: expireDays ? parseInt(expireDays, 10) : undefined,
            }),
          }
        );
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error);
        return { location: json.data.url };
      },
      abortMultipartUpload: async (_file: any, opts: any) => {
        const { uploadId, key } = opts;
        await fetch(`${API_BASE}/upload/s3/multipart/${encodeURIComponent(uploadId)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ key }),
        });
      },
    });

    uppy.on('progress', (pct: number) => setUploadProgress(pct));
    uppy.on('upload', () => { setUploading(true); setError(null); });
    uppy.on('complete', () => { setUploading(false); onUploadComplete(); });
    uppy.on('error', (err: any) => { setError((err as Error).message); setUploading(false); });

    uppyRef.current = uppy;

    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [s3Enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add files ──

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      // S3 multipart via Uppy
      if (uppyRef.current) {
        setUploading(true);
        setUploadProgress(0);
        setUploadCount({ done: 0, total: files.length });
        setError(null);
        for (const file of files) uppyRef.current.addFile({ name: file.name, type: file.type, data: file });
        return;
      }

      // Legacy XHR
      setUploading(true);
      setUploadProgress(0);
      setUploadCount({ done: 0, total: files.length });
      setError(null);

      (async () => {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          const form = new FormData();
          form.append('file', file);
          try {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
              });
              xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else {
                  try { reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed')); }
                  catch { reject(new Error('Upload failed')); }
                }
              });
              xhr.addEventListener('error', () => reject(new Error('Network error')));
              let url = `${API_BASE}/upload`;
              if (expireDays) url += `?expires=${expireDays}`;
              xhr.open('POST', url);
              if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              xhr.setRequestHeader('X-File-Expires', expireDays);
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
        await onUploadComplete();
      })();
    },
    [token, expireDays, onUploadComplete]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) addFiles(Array.from(fileList));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="w-full max-w-2xl px-4 mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        className={`relative flex flex-col items-center justify-center h-40 rounded-xl border-2 cursor-pointer transition-all select-none overflow-hidden pb-8 ${
          dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-48">
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-xs text-zinc-400">
              {uploadCount.total > 1
                ? `Uploading ${uploadCount.done + 1}/${uploadCount.total} — ${uploadProgress}%`
                : uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
            </span>
          </div>
        ) : (
          <>
            <svg className="w-20 h-16 mb-3 text-blue-500/50" viewBox="0 0 80 60" fill="currentColor">
              <path d="M16 46c-6.63 0-12-5.37-12-12s5.37-12 12-12c1.6-5.6 7-9.6 13.2-9.6 5.8 0 10.8 3.4 12.8 8.4 3.6-1.6 7.6-2.4 12-2.4 8.8 0 16 7.2 16 16s-7.2 16-16 16H16z" opacity="0.25" />
              <path d="M28 38l12 10 12-10M40 48V26" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-sm text-zinc-400">Drop a file here or click to browse</span>
            {s3Enabled && <span className="text-xs text-zinc-600 mt-1">Multipart upload direct to storage</span>}
          </>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} multiple aria-label="Choose files to upload" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800/50 border-t border-zinc-700/50" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] text-zinc-500 whitespace-nowrap">⏱️ Auto-delete:</span>
          <select value={expireDays} onChange={(e) => setExpireDays(e.target.value)} className="bg-transparent text-zinc-400 text-[11px] focus:outline-none cursor-pointer">
            <option value="">Never</option>
            <option value="1">After 1 day</option>
            <option value="7">After 7 days</option>
            <option value="30">After 30 days</option>
            <option value="90">After 90 days</option>
          </select>
        </div>
      </div>
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
    </div>
  );
}
