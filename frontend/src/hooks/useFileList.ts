'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileInfo, FilePage } from '@/types';

interface UseFileListOptions {
  pageSize?: number;
}

/**
 * Hook for file listing with independent pagination for files and images.
 */
export function useFileList(
  api: (path: string, options?: RequestInit) => Promise<Response>,
  { pageSize = 50 }: UseFileListOptions = {}
) {
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

  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  searchRef.current = search;

  const fetchFiles = useCallback(
    async (p = 1, imgP = 1, searchTerm = '') => {
      try {
        const base = new URLSearchParams({ limit: String(pageSize) });
        if (searchTerm) base.set('search', searchTerm);

        const fileParams = new URLSearchParams(base);
        fileParams.set('page', String(p));
        fileParams.set('type', 'file');

        const imgParams = new URLSearchParams(base);
        imgParams.set('page', String(imgP));
        imgParams.set('type', 'image');

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
    },
    [api, pageSize]
  );

  return {
    files,
    page,
    totalPages,
    total,
    imageFiles,
    imagePage,
    imageTotalPages,
    imageTotal,
    search,
    searchRef,
    fetchFiles,
    setSearch,
  };
}
