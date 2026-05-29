const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Raw fetch wrapper that attaches the auth token if available.
 * For use outside React components (e.g., in utilities).
 */
export function apiFetch(
  token: string | null,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export { API_BASE };
