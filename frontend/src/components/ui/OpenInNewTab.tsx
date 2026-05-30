interface Props {
  href: string;
  /** Optional: extra onClick handler (e.g. stopPropagation in lightbox) */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function OpenInNewTab({ href, onClick }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
      onClick={onClick}
    >
      Open in new Tab
    </a>
  );
}
