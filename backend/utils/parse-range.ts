/**
 * Parse an HTTP Range header. Returns `{ start, end }` or `null` if invalid.
 * Handles: `bytes=0-1023`, `bytes=1024-`, `bytes=-512`
 */
export function parseRange(
  header: string,
  fileSize: number
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const rawStart = match[1] ?? '';
  const rawEnd = match[2] ?? '';

  let start: number;
  let end: number;

  if (rawStart === '' && rawEnd === '') return null;

  if (rawStart !== '' && rawEnd !== '') {
    start = parseInt(rawStart, 10);
    end = parseInt(rawEnd, 10);
  } else if (rawStart !== '') {
    // bytes=N- → from N to end
    start = parseInt(rawStart, 10);
    end = fileSize - 1;
  } else {
    // bytes=-N → last N bytes
    const suffix = parseInt(rawEnd, 10);
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end >= fileSize ||
    start > end
  ) {
    return null;
  }

  return { start, end };
}
