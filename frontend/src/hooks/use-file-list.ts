'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileInfo, FilePage } from '@/types';
import type { FilesViewMode } from '@/features/dashboard/DashboardProvider';

interface UseFileListOptions {
  pageSize?: number;
}

/**
 * Hook for file listing with independent pagination per type (images, audio, video, files).
 */
export function useFileList(
  api: (path: string, options?: RequestInit) => Promise<Response>,
  { pageSize = 50 }: UseFileListOptions = {}
) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [imageFiles, setImageFiles] = useState<FileInfo[]>([]);
  const [imagePage, setImagePage] = useState(1);
  const [imageTotalPages, setImageTotalPages] = useState(0);
  const [imageTotal, setImageTotal] = useState(0);

  const [audioFiles, setAudioFiles] = useState<FileInfo[]>([]);
  const [audioPage, setAudioPage] = useState(1);
  const [audioTotalPages, setAudioTotalPages] = useState(0);
  const [audioTotal, setAudioTotal] = useState(0);

  const [videoFiles, setVideoFiles] = useState<FileInfo[]>([]);
  const [videoPage, setVideoPage] = useState(1);
  const [videoTotalPages, setVideoTotalPages] = useState(0);
  const [videoTotal, setVideoTotal] = useState(0);

  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  searchRef.current = search;

  const fetchFiles = useCallback(
    async (viewMode: FilesViewMode, p = 1, searchTerm = '') => {
      try {
        const base = new URLSearchParams({ limit: String(pageSize) });
        if (searchTerm) base.set('search', searchTerm);

        if (viewMode === 'all') {
          const build = (type: string, pageNum: number) => {
            const params = new URLSearchParams(base);
            params.set('page', String(pageNum));
            params.set('type', type);
            return params.toString();
          };

          const [fileRes, imgRes, audioRes, videoRes] = await Promise.all([
            api(`/files?${build('file', p)}`),
            api(`/files?${build('image', p)}`),
            api(`/files?${build('audio', p)}`),
            api(`/files?${build('video', p)}`),
          ]);

          const apply = (res: Response, setter: (d: FilePage) => void) => {
            if (res.ok) res.json().then(setter);
          };
          apply(fileRes, (d) => { setFiles(d.files); setPage(d.page); setTotalPages(d.totalPages); setTotal(d.total); });
          apply(imgRes, (d) => { setImageFiles(d.files); setImagePage(d.page); setImageTotalPages(d.totalPages); setImageTotal(d.total); });
          apply(audioRes, (d) => { setAudioFiles(d.files); setAudioPage(d.page); setAudioTotalPages(d.totalPages); setAudioTotal(d.total); });
          apply(videoRes, (d) => { setVideoFiles(d.files); setVideoPage(d.page); setVideoTotalPages(d.totalPages); setVideoTotal(d.total); });
        } else {
          const params = new URLSearchParams(base);
          params.set('page', String(p));
          // Map viewMode plural forms to API singular forms (images→image)
          const apiType = viewMode === 'images' ? 'image' : viewMode;
          params.set('type', apiType);

          const res = await api(`/files?${params.toString()}`);
          if (res.ok) {
            const d: FilePage = await res.json();
            setFiles([]); setTotal(0);
            setImageFiles([]); setImageTotal(0);
            setAudioFiles([]); setAudioTotal(0);
            setVideoFiles([]); setVideoTotal(0);

            if (viewMode === 'file') { setFiles(d.files); setPage(d.page); setTotalPages(d.totalPages); setTotal(d.total); }
            else if (viewMode === 'images') { setImageFiles(d.files); setImagePage(d.page); setImageTotalPages(d.totalPages); setImageTotal(d.total); }
            else if (viewMode === 'audio') { setAudioFiles(d.files); setAudioPage(d.page); setAudioTotalPages(d.totalPages); setAudioTotal(d.total); }
            else if (viewMode === 'video') { setVideoFiles(d.files); setVideoPage(d.page); setVideoTotalPages(d.totalPages); setVideoTotal(d.total); }
          }
        }
      } catch {
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
    audioFiles,
    audioPage,
    audioTotalPages,
    audioTotal,
    videoFiles,
    videoPage,
    videoTotalPages,
    videoTotal,
    search,
    searchRef,
    fetchFiles,
    setSearch,
  };
}
