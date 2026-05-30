# Copilot Instructions for ShareIT

## Project Context

* Full-stack file hosting app
* Backend: Fastify + TypeScript + SQLite
* Frontend: Next.js + React + Tailwind CSS

---

## Project Structure

### Backend

```text
backend/
  config/         Environment config and constants
  db/             Database setup, schema, migrations
  middleware/     Auth and request middleware
  routes/         HTTP handlers only
  services/       Business logic
  repositories/   Database queries
  storage/        Storage providers (local, B2)
  utils/          Shared helpers
  tests/
```

### Frontend

```text
frontend/src/
  app/            Next.js routes/pages
  components/     Reusable UI components
  hooks/          Custom React hooks
  lib/            API client and utilities
  features/       Feature-specific logic
  types/          Shared types
```

---

## Golden Path

### Backend

```text
Request
  ↓
Route
  ↓
Service
  ↓
Repository
  ↓
Database
```

Rules:

* Routes handle HTTP only.
* Services contain business logic.
* Repositories contain database queries.
* Never access the database directly from routes.
* Never put business logic in routes.

### Frontend

```text
Page
  ↓
Component
  ↓
Hook
  ↓
API Client
  ↓
Backend API
```

Rules:

* Pages compose components.
* Components render UI.
* Hooks manage client-side state and data fetching.
* API calls go through shared API utilities.
* Keep components small and focused.

---

## Architecture Rules

* Follow existing patterns before creating new ones.
* Reuse existing components, hooks, services, and utilities.
* Avoid duplicate implementations.
* Prefer simple solutions.
* Keep files focused and easy to read.

---

## TypeScript

* TypeScript strict mode.
* Avoid `any`.
* Prefer explicit types.
* Backend uses ESM imports with `.js` extensions.

---

## Next.js

* Use Server Components by default.
* Add `"use client"` only when required.
* Keep business logic in the backend.
* Do not move backend logic into Next.js routes.

---

## Database

* Use parameterized queries only.
* Never build SQL with string interpolation.
* Database access belongs in repositories.

---

## Security

* Validate all input at route boundaries.
* Never trust client input.
* Validate file metadata server-side.
* Sanitize filenames before storage.

---

## Error Handling

* Services may throw errors.
* Routes convert errors into HTTP responses.
* Services must not return HTTP responses.

---

## Testing

* New features should include tests.
* Backend changes → backend tests.
* Frontend changes → frontend tests.
* All tests should pass before completion.
