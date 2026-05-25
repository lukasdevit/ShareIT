/**
 * Extract pagination params from request query.
 */
export function parsePagination(query: Record<string, string | undefined>, defaultLimit = 25) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  const search = query.search?.trim() || "";
  return { page, limit, offset, search };
}
