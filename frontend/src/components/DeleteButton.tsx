"use client";

interface Props {
  id: number;
  confirming: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function DeleteButton({ id, confirming, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
        confirming
          ? "bg-red-600 hover:bg-red-500 text-white"
          : "bg-zinc-800 hover:bg-red-800 text-zinc-400 hover:text-red-400"
      }`}
    >
      {confirming ? "Confirm?" : "Delete"}
    </button>
  );
}
