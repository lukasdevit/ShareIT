"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import type { FileInfo, FilePage } from "@/lib/types";

interface UseFilesOptions {
  pageSize?: number;
}

/**
 * Hook for file listing, upload, delete, and toggle-public operations.
 * Fetches images and other files in parallel for independent pagination.
 */
export function useFiles({ pageSize = 50 }: UseFilesOptions = {}) {
  const { api } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Non-image files
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Images
  const [imageFiles, setImageFiles] = useState<FileInfo[]>([]);
  const [imagePage, setImagePage] = useState(1);
  const [imageTotalPages, setImageTotalPages] = useState(0);
  const [imageTotal, setImageTotal] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expireDays, setExpireDays] = useState("");

  const fetchFiles = useCallback(async (p = 1, imgP = 1, searchTerm = "") => {
    try {
      const base = new URLSearchParams({ limit: String(pageSize) });
      if (searchTerm) base.set("search", searchTerm);

      const fileParams = new URLSearchParams(base);
      fileParams.set("page", String(p));
      fileParams.set("type", "file");

      const imgParams = new URLSearchParams(base);
      imgParams.set("page", String(imgP));
      imgParams.set("type", "image");

      const [fileRes, imgRes] = await Promise.all([
        api(`/files?${fileParams.toString()}`),
        api(`/files?${imgParams.toString()}`),
      ]);

      if (fileRes.ok) {
        const d: FilePage = await fileRes.json();
        setFiles(d.files);
        setPage(d.page);
        setTotalPages(d.totalPages);
        setTotal(d.total);
      }
      if (imgRes.ok) {
        const d: FilePage = await imgRes.json();
        setImageFiles(d.files);
        setImagePage(d.page);
        setImageTotalPages(d.totalPages);
        setImageTotal(d.total);
      }
    } catch {
      // handled by caller
    }
  }, [api, pageSize]);

  const uploadFile = useCallback(async (fileOrFiles: File | File[]) => {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadCount({ done: 0, total: files.length });
    setError(null);

    const token = localStorage.getItem("shareit_token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const form = new FormData();
      form.append("file", file);

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else {
              try {
                const d = JSON.parse(xhr.responseText);
                reject(new Error(d.error || "Upload failed"));
              } catch { reject(new Error("Upload failed")); }
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));

          let url = `${baseUrl}/upload`;
          if (expireDays) url += `?expires=${expireDays}`;
          xhr.open("POST", url);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("X-File-Expires", expireDays);
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
    await fetchFiles(1, 1, search);
  }, [api, fetchFiles, search, expireDays]);

  const deleteFile = useCallback(async (id: number, force = false) => {
    if (force || deletingId === id) {
      setDeletingId(null);
      await api(`/file/${id}`, { method: "DELETE" });
      await fetchFiles(1, 1, search);
    } else {
      setDeletingId(id);
    }
  }, [api, deletingId, fetchFiles, search]);

  const togglePublic = useCallback(async (id: number, isPublic: boolean) => {
    await api(`/file/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });
    await fetchFiles(1, 1, search);
  }, [api, fetchFiles, search]);

  const copyLink = useCallback((filename: string, id: number) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${base}/file/${filename}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFile(Array.from(e.dataTransfer.files));
    }
  }, [uploadFile]);

  return {
    // State — files (non-image)
    files, page, totalPages, total,
    // State — images
    imageFiles, imagePage, imageTotalPages, imageTotal,
    // State — UI
    uploading, uploadProgress, uploadCount, dragOver, error, copiedId, deletingId,
    search, expireDays, fileInputRef,
    // Actions
    fetchFiles, uploadFile, deleteFile, togglePublic, copyLink,
    setSearch, setExpireDays, setDragOver, setError, handleDrop,
  };
}
