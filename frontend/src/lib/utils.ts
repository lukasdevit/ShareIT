export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function isText(mime: string): boolean {
  return (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime.endsWith('+xml') ||
    mime === 'application/javascript'
  );
}

export function isAudio(mime: string): boolean {
  return mime.startsWith('audio/');
}

export function isVideo(mime: string): boolean {
  return mime.startsWith('video/');
}

/**
 * Returns true if the file can be opened in a viewer (text, PDF, video, audio).
 * Audio uses the bottom bar player, not a modal — but is still "openable"
 * so the file row is clickable.
 */
export function isOpenable(mime: string): boolean {
  return isText(mime) || mime === 'application/pdf' || isAudio(mime) || isVideo(mime);
}
