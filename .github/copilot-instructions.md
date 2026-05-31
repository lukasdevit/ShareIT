# Copilot / AI Instructions for ShareIT

**Version:** 1.2  
**Date:** 31.05.2026

## Project Context

Full-stack self-hosted file sharing application (ShareX compatible).  

**Backend:** Fastify + TypeScript + SQLite  
**Frontend:** Next.js 15 (App Router) + React + Tailwind + TypeScript

---

## Project Structure

### Backend

```text
backend/
  config/           # env, constants, limits
  db/               # schema, migrations, connection
  middleware/       # auth, error, logging
  routes/           # only HTTP layer (thin)
  services/         # business logic — most changes happen here
  repositories/     # raw database queries
  utils/            # pure functions, helpers
  tests/
```

### Frontend

```text
frontend/
  src/
    app/              # Next.js routes & layouts
    components/       # reusable UI
    features/         # feature slices (upload, admin, auth…)
    hooks/            # custom hooks
    lib/              # api client, utils
    types/            # shared TypeScript types
  tests/
```

---

## Golden Path

### Backend

```text
Request → Route → Service → Repository → Database/Storage
```

- **Routes** — request validation, service call, HTTP response only.
- **Services** — all business logic (quota, upload flow, cleanup, validation).
- **Repositories** — database queries exclusively.
- Middleware may read from repositories but must not contain business logic.
- Never call the database directly from a route or middleware.

### Frontend

```text
Page → Component → Hook → API Client → Backend
```

- Server Components by default.
- `"use client"` only when truly needed (interactions, state).
- Components should be small and UI-focused.
- Logic belongs in hooks or the backend.

---

## Naming Convention

Always follow `Naming-Convention.md` — it is the single source of truth for all naming rules in this project.

---

## Key Architecture Rules

- **Keep files small and focused** — one file, one responsibility. Split files above ~300 lines.
- **Reuse existing code** when it clearly matches the same responsibility. Do not create abstractions unless duplication is real and repeated.
- Services orchestrate. Repositories access data. Never cross those boundaries.
- All file operations must use the `storage/` abstraction. Services must not directly use filesystem or storage providers (S3, B2).

### TypeScript

- Strict mode.
- Avoid `any` — prefer explicit types.

---

## Database

- Use parameterized queries only.
- Never build SQL with string interpolation.
- Database access belongs in repositories.

---

## Security

- Validate all input on the server.
- Validate file metadata server-side.
- Sanitize filenames before storage.
- Check quota before writing a file.
- Never trust client input.

---

## Error Handling

- Services throw domain errors (StorageQuotaError, AppError, etc.).
- Routes catch errors and return the appropriate HTTP status.
- Services never return HTTP status codes or responses.

---

## Testing

- New features should include tests.
- Backend changes → backend tests.
- Frontend changes → frontend tests.
- All tests must pass before marking task as done.
