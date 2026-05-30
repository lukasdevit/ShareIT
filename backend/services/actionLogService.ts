import { insertAction } from '../repositories/actionRepository.js';

/**
 * Record an admin action with optional undo data.
 * Thin service wrapper — routes call this, it delegates to the repository.
 */
export async function recordAction(
  username: string,
  action: string,
  description: string,
  undoData?: Record<string, unknown>
): Promise<number> {
  return insertAction(username, action, description, undoData);
}
