'use client';

import { useRef, useState, useCallback } from 'react';
import { useUppyUpload } from '@/hooks/use-uppy-upload';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  s3Enabled: boolean;
  token: string | null;
  onUploadComplete: () => Promise<void>;
}

export function UploadZone({ s3Enabled, token, onUploadComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { api } = useAuth();
  const uppy = useUppyUpload(s3Enabled, token);
  const legacy = useFileUpload(api, token);

  const uploading = s3Enabled ? uppy.uploading : legacy.uploading;
  const uploadProgress = s3Enabled ? uppy.uploadProgress : legacy.uploadProgress;
  const error = s3Enabled ? uppy.error : legacy.error;

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      if (s3Enabled && uppy.uppyRef.current) {
        uppy.addFiles(files);
      } else {
        legacy.uploadFile(files, onUploadComplete);
      }
    },
    [s3Enabled, uppy, legacy, onUploadComplete]
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
              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
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
