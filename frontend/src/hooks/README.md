# hooks/

Shared React hooks.

- `useFileList` — File listing with parallel files + images pagination and search.
- `useFileUpload` — XHR upload with progress tracking and drag-and-drop.
- `useFileActions` — Delete (with confirmation), toggle public, copy link.
- `useFileViewer` — Lightbox and text viewer state management.
- `useFiles` — Deprecated barrel; prefer the three individual hooks above.

**Rules**: Hooks may use `useAuth` and `api-client`. No UI rendering. Actions accept an `onSuccess` callback for caller-side refresh orchestration.
