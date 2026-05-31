import { ALLOWED_MIME_TYPES } from '../config/allowed-files.js';

export function validateFile(
  mimeType: string,
  _originalName: string
): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `File type "${mimeType}" is not allowed`;
  }
  return null;
}
