# lib/

Pure utilities and API communication — no React, no JSX.

- `api-client.ts` — Fetch wrapper with auth token injection. Used by AuthProvider and hooks.
- `utils.ts` — `formatSize`, `formatDate`, `isImage`, `isText`, `isOpenable`.

**Rules**: No React imports. No components. No hooks.
