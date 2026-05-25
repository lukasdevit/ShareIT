// Re-export from the split modules for backward compatibility.
// New code should import directly from:
//   - `@/lib/auth-context` for AuthProvider, useAuth
//   - `@/lib/api-client`  for apiFetch, API_BASE

export { AuthProvider, useAuth } from "./auth-context";
export type { AuthState } from "./auth-context";
export { apiFetch, API_BASE } from "./api-client";

