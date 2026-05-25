"use client";

import { RefObject } from "react";

interface Props {
  uploading: boolean;
  uploadProgress: number;
  dragOver: boolean;
  error: string | null;
  expireDays: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExpireChange: (value: string) => void;
}

export function UploadZone({ uploading, uploadProgress, dragOver, error, expireDays, fileInputRef, onDragOver, onDragLeave, onDrop, onFileChange, onExpireChange }: Props) {
  return (
    <div className="w-full max-w-2xl px-4 mb-8">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none ${
          dragOver ? "border-blue-400 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-48">
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Processing..."}
            </span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mb-2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm text-zinc-400">Drop a file here or click to browse</span>
          </>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
      </div>
      {!uploading && (
        <select
          value={expireDays}
          onChange={(e) => onExpireChange(e.target.value)}
          className="mt-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">No expiration</option>
          <option value="1">Expires in 1 day</option>
          <option value="7">Expires in 7 days</option>
          <option value="30">Expires in 30 days</option>
          <option value="90">Expires in 90 days</option>
        </select>
      )}
      {error && <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
    </div>
  );
}
