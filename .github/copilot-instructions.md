# Copilot Instructions for ShareIT

<!-- This file tells Copilot how to work in this project. Copilot reads this on every interaction. -->

## Project Context

- Full-stack file hosting app (ShareIT)
- Backend: Fastify + TypeScript + SQLite
- Frontend: Next.js 16 + React 19 + Tailwind CSS 4
- Node 24 (via fnm), Docker: node:24-alpine

## Changes That Require Asking First

- Docker, docker-compose, Caddyfile, deploy scripts
- Database schema, migrations, seed data
- Auth/security (JWT, bcrypt, rate limits, CORS, helmet)
- CI/CD (GitHub Actions, semantic-release config)

## Architecture Rules

- Route layer handles HTTP only (request/response)
- Service layer contains business logic only
- DB layer contains only queries
- Never mix responsibilities between layers

## Coding Style

### General

- TypeScript strict mode, ESM (`"type": "module"`)
- Backend: no default exports
- Frontend (Next.js): default exports allowed only for pages/routes
- Backend imports must use `.js` extension (NodeNext resolution)

### Functions

- Prefer function declarations for backend services and utilities (hoisting, stack traces)
- Arrow functions allowed for:
  - pure functions
  - callbacks
  - inline logic

### React Components

- Functional components only (no classes)
- Hooks must be at top level of components
- Hooks must not be called conditionally
- Co-locate small private components in same file
- Extract only if reused or >50 lines

### Next.js Rules

- Use `"use client"` only when required (hooks, browser APIs)
- Default to Server Components
- API logic must stay in backend

### Databases

- Always use parameterized queries
- Never concatenate SQL strings with user input
- Never build SQL via string interpolation

## API Conventions

- REST-style endpoints only
- No mixed response formats
- Files must not be returned directly from services (only route layer)

### API Response Format

- Success: `{ data }`
- Error: `{ error: string }`
- Never return both `data` and `error` together

### Frontend Data Fetching

- Raw `fetch()` with an auth wrapper in `frontend/src/lib/api-client.ts` — no React Query, no SWR
- Token stored in `localStorage`, attached as `Authorization: Bearer <token>` header
- Components receive `apiFetch` as a prop; hooks (like `useFiles`) handle pagination/search
- API base URL from `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:3000`)
- Response is parsed manually in each caller — no generated client or shared response handler

### Security Defaults

- Validate all input at route boundary using schema validation
- Do not use manual validation when schema exists
- Never trust file metadata from client
- Limit upload size at route level

### File Handling

- Validate file metadata server-side
- Sanitize filenames before storage
- Never trust client-provided paths or extensions
- File storage must be separate from route handlers
- Per-request upload limit: **1 GB** (multipart, set in `src/app.ts`)
- Per-user storage quota: **10 GB** (`DEFAULT_STORAGE_LIMIT` in `src/config/index.ts`)
- Allowed MIME types defined in `ALLOWED_MIME_TYPES` in `src/config/index.ts`

## Environment Variables

- Never access process.env outside of a dedicated config module
- `.env` at project root, loaded via Node 24 `--env-file=.env` flag (no `dotenv`)
- Template: `.env.example` with inline docs for every var
- All config lives in `src/config/index.ts` — the single source of truth


## Error Handling
- Route handlers must not throw expected errors (404, validation, etc.)
- Service layer must not return HTTP responses
- Service layer may throw errors with optional `statusCode`

```ts
// Route
if (!file) return reply.code(404).send({ error: "File not found" });

// Service
throw Object.assign(new Error("Unsupported MIME type"), { statusCode: 415 });
```

- Global `setErrorHandler` in `src/app.ts` handles unexpected errors
- Standard HTTP codes: 400, 401, 403, 404, 409, 415, 429, 500

## Logging

- Use Fastify's built-in pino logger (`request.log` / `app.log`) for all backend logging
- Never use `console.log` in production code
- `console.warn` / `console.error` allowed only for startup/bootstrap failures before the logger is ready

## Import Order

1. Node built-ins
2. React / Next.js imports
3. Third-party packages
4. Internal modules

## Commit & Release

- check if you are on the correct branch, if not make one.
- See `/memories/repo/commit-conventions.md`
- `fix:` → patch release
- `feat:` → minor release
- `!` or `BREAKING CHANGE` → major release
- `chore`, `style`, `refactor`, `docs`, `test`, `ci` do not trigger release
- Prefer squash merges (one clean commit per PR)
- Branch naming:
  - `feat/description`
  - `fix/description`
  - `chore/description`
  - `style/description`
- Merge via `gh pr merge --squash --delete-branch`

## Testing

- New features must include tests
- Assume CI runs `npm test` before merge
- All tests must pass before changes are considered complete

## Formatting & Linting
- Prettier handles all formatting — do not manually format code
- ESLint handles code quality — fix all errors before committing
- Never override Prettier or ESLint rules without a comment explaining why
- Do not add `// @ts-ignore` without justification
- Prefer `unknown` over `any` for error types
- No raw `any` unless unavoidable — use `// eslint-disable` with a reason if so
