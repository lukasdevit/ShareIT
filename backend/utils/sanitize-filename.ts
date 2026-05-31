import path from 'path';

export function sanitizeFilename(name: string): string {
  let safe = path.basename(name);
  safe = safe.replace(/\0/g, '');
  safe = safe.trim();
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }
  return safe || 'untitled';
}
