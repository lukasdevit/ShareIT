"use client";

interface Props {
  filename: string;
  id: number;
  copiedId: number | null;
  onClick: (e: React.MouseEvent) => void;
}

export function CopyButton({ filename, id, copiedId, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
    >
      {copiedId === id ? "✓ Copied" : "Copy link"}
    </button>
  );
}
