'use client';

import { formatSize, formatDate } from '@/lib/utils';
import type { FileInfo } from '@/types';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { CopyButton } from '@/components/ui/CopyButton';
import { useGlowEffect } from '@/hooks/use-glow-effect';

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

function GlowImageCard({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const { ref, onMouseMove, onMouseLeave } = useGlowEffect<HTMLDivElement>();
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="pressable glow-hover glow-blue group relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:shadow-lg hover:shadow-black/30 cursor-pointer transition-[border-color,box-shadow] duration-200"
    >
      {children}
    </div>
  );
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
          <GlowImageCard key={f.id} onClick={() => onOpenLightbox(idx)}>
            <img
              src={`${location.origin}/file/${f.filename}`}
              alt={f.original_name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              loading="lazy"
            />

            {/* Hover overlay — bottom bar with actions */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-2 pt-8 bg-linear-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs font-medium text-white truncate drop-shadow-sm">{f.original_name}</p>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                {formatSize(f.size)} · {formatDate(f.created_at)}
              </p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
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
          </GlowImageCard>
        ))}
      </div>
    </section>
  );
}
