'use client';

/**
 * @deprecated Import individual hooks from:
 *   - @/hooks/useFileList
 *   - @/hooks/useFileUpload
 *   - @/hooks/useFileActions
 *
 * This barrel is kept for backwards compatibility.
 */
export { useFileList as useFiles } from './useFileList';
export { useFileUpload } from './useFileUpload';
export { useFileActions } from './useFileActions';
