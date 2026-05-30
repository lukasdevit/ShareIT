'use client';

import { FileList } from '@/components/files/FileList';
import { Pagination } from '@/components/ui/Pagination';
import type { FileInfo } from '@/types';
import type { FilesViewMode } from '@/features/dashboard/DashboardProvider';

interface Props {
  label: string;
  files: FileInfo[];
  total: number;
  page: number;
  totalPages: number;
  copiedId: number | null;
  deletingId: number | null;
  currentAudioId: number | null;
  filesViewMode: FilesViewMode;
  showDivider: boolean;
  search: string;
  onCopyLink: (filename: string, id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onDelete: (id: number) => void;
  onOpenViewer: (file: FileInfo) => void;
  onPlayAudio: (file: FileInfo) => void;
  onPageChange: (page: number) => void;
}

export function FileSection({
  label,
  files,
  total,
  page,
  totalPages,
  copiedId,
  deletingId,
  currentAudioId,
  filesViewMode,
  showDivider,
  search,
  onCopyLink,
  onTogglePublic,
  onDelete,
  onOpenViewer,
  onPlayAudio,
  onPageChange,
}: Props) {
  if (files.length === 0) return null;

  return (
    <>
      {showDivider && <hr className="border-zinc-800" />}
      {filesViewMode === 'all' && (
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label} ({total})
        </h2>
      )}
      <FileList
        files={files}
        total={total}
        copiedId={copiedId}
        deletingId={deletingId}
        currentAudioId={currentAudioId}
        onCopyLink={onCopyLink}
        onTogglePublic={onTogglePublic}
        onDelete={onDelete}
        onOpenViewer={onOpenViewer}
        onPlayAudio={onPlayAudio}
      />
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPrev={() => onPageChange(page - 1)}
          onNext={() => onPageChange(page + 1)}
          label={label}
        />
      )}
    </>
  );
}
