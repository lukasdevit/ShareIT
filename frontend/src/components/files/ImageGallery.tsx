'use client';

import { formatSize, formatDate } from '@/lib/utils';
import type { FileInfo } from '@/types';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { CopyButton } from '@/components/ui/CopyButton';

interface Props {
  images: FileInfo[];
  total?: number;
  copiedId: number | null;
  deletingId: number | null;
  onCopyLink: (filename: string, id: number) => void;
  onDelete: (id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
  onOpenLightbox: (index: number) => void;
}

export function ImageGallery({
  images,
  total,
  copiedId,
  deletingId,
  onCopyLink,
  onDelete,
  onTogglePublic,
  onOpenLightbox,
}: Props) {
  return (
    <section>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((f, idx) => (
          <div
            key={f.id}
            onClick={() => onOpenLightbox(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenLightbox(idx);
              }
            }}
            role="button"
            tabIndex={0}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
          >
            <img
              src={`${location.origin}/file/${f.filename}`}
              alt={f.original_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 right-2">
              <VisibilityToggle
                isPublic={!!f.is_public}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePublic(f.id, !f.is_public);
                }}
              />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
              <p className="text-xs text-white truncate">{f.original_name}</p>
              <p className="text-xs text-zinc-400">
                {formatSize(f.size)} · {formatDate(f.created_at)}
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                <CopyButton
                  filename={f.filename}
                  id={f.id}
                  copiedId={copiedId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyLink(f.filename, f.id);
                  }}
                />
                <VisibilityToggle
                  isPublic={!!f.is_public}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePublic(f.id, !f.is_public);
                  }}
                />
                <DeleteButton
                  id={f.id}
                  confirming={deletingId === f.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(f.id);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
