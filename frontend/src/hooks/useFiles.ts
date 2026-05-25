"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import type { FileInfo, FilePage } from "@/lib/types";

interface UseFilesOptions {
  pageSize?: number;
}

/**
 * Hook for file listing, upload, delete, and toggle-public operations.
 */
export function useFiles({ pageSize = 50 }: UseFilesOptions = {}) {
  const { api } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expireDays, setExpireDays] = useState("");

  const fetchFiles = useCallback(async (p = 1, searchTerm = "") => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
      if (searchTerm) params.set("search", searchTerm);
      const r = await api(`/files?${params.toString()}`);
      if (r.ok) {
        const d: FilePage = await r.json();
        setFiles(d.files);
        setPage(d.page);
        setTotalPages(d.totalPages);
        setTotal(d.total);
      }
    } catch {
      // handled by caller
    }
  }, [api, pageSize]);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem("shareit_token");

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
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

        let url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/upload`;
        if (expireDays) url += `?expires=${expireDays}`;
        xhr.open("POST", url);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("X-File-Expires", expireDays);
        xhr.send(form);
      });

      setUploading(false);
      await fetchFiles(page, search);
    } catch (err) {
      setError((err as Error).message);
      setUploading(false);
    }
  }, [api, fetchFiles, page, search, expireDays]);

  const deleteFile = useCallback(async (id: number) => {
    if (deletingId === id) {
      setDeletingId(null);
      await api(`/file/${id}`, { method: "DELETE" });
      await fetchFiles(page, search);
    } else {
      setDeletingId(id);
    }
  }, [api, deletingId, fetchFiles, page, search]);

  const togglePublic = useCallback(async (id: number, isPublic: boolean) => {
    await api(`/file/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });
    await fetchFiles(page, search);
  }, [api, fetchFiles, page, search]);

  const copyLink = useCallback((filename: string, id: number) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${base}/file/${filename}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }, [uploadFile]);

  return {
    // State
    files, page, totalPages, total, uploading, uploadProgress,
    dragOver, error, copiedId, deletingId, search, expireDays,
    fileInputRef,
    // Actions
    fetchFiles, uploadFile, deleteFile, togglePublic, copyLink,
    setSearch, setExpireDays, setDragOver, setError,
    handleDrop,
  };
}
