# components/

Reusable UI components organized by domain.

- `ui/` — Primitive components: buttons, toasts, skeletons, metric cards.
- `files/` — File-related: upload zone, gallery, lightbox, file list, text viewer.
- `admin/` — Admin panel sub-components: user manager, DB browser, analytics, etc.
- `layout/` — Layout components: NavHeader.
- Top-level — Self-contained page sections: `LandingPage`, `FilesPanel`, `SettingsPage`.

**Rules**: Components receive data via props. No direct API calls. Use `@/` imports.
