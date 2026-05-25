# ShareIT

Self-hosted file upload and sharing service with ShareX support, user management, and Backblaze B2 cloud storage.

## Features

- Drag & drop uploads with image previews
- ShareX integration (one-click screenshot → upload)
- User accounts with JWT auth
- Admin panel with SQL editor, user management, and table browser
- Backblaze B2 cloud storage with streaming multipart uploads
- Paginated file lists, copy-to-clipboard, lightbox viewer
- Virus scanning via ClamAV
- Rate limiting, login lockout, CORS config, HTTPS via Caddy

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lukasdevit/projectS.git
cd projectS
cp .env.example .env

# 2. Generate a JWT secret
openssl rand -hex 32
# → paste into .env as JWT_SECRET=

# 3. Start (Docker)
docker compose -f docker-compose.dev.yml up -d --build

# 4. Open
open http://localhost:3001
```

Default admin: `admin` / `admin123` (change via `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`).

## Development vs Production

```bash
# Dev — hot reload, no HTTPS, direct ports
docker compose -f docker-compose.dev.yml up -d

# Production — builds, HTTPS via Caddy
DOMAIN=files.example.com docker compose up -d --build
```

| Mode | API | Frontend | HTTPS |
|------|-----|----------|-------|
| Dev | `:3000` | `:3001` | No |
| Prod | via Caddy | via Caddy | Auto Let's Encrypt |

## Configuration

Everything lives in `src/config/index.ts`. Only secrets go in `.env`:

| `.env` variable | Required | Default |
|-----------------|----------|---------|
| `JWT_SECRET` | **Yes** | — |
| `ADMIN_USERNAME` | No | `admin` |
| `ADMIN_PASSWORD` | No | `admin123` |
| `B2_ENABLED` | No | `false` (local storage) |
| `B2_ENDPOINT` | For B2 | — |
| `B2_KEY_ID` | For B2 | — |
| `B2_APP_KEY` | For B2 | — |
| `B2_BUCKET` | For B2 | — |
| `B2_PREFIX` | No | `ShareIt/uploads/` |
| `DOMAIN` | For HTTPS | `localhost` |
| `DB_PATH` | No | `./database.db` |
| `BASE_URL` | No | `http://localhost:3000` |

To change rate limits, storage quotas, file types — edit `src/config/index.ts` directly.

## Enabling Cloud Storage (B2)

```dotenv
B2_ENABLED=true
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
B2_REGION=eu-central-003
B2_KEY_ID=your-key-id
B2_APP_KEY=your-app-key
B2_BUCKET=your-bucket
```

Files are stored as `{B2_PREFIX}{userId}/YYYY/MM/DD/filename`. Leave `B2_ENABLED=false` for local filesystem storage.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Fastify (Node.js + TypeScript) |
| Frontend | Next.js 15 + Tailwind CSS |
| Database | SQLite |
| Auth | JWT + bcrypt |
| Storage | Local FS or Backblaze B2 (S3-compatible) |
| Reverse Proxy | Caddy (auto HTTPS) |
| CI | GitHub Actions (51 tests) |

## Testing

```bash
npm test          # 51 integration tests
npm run dev:all   # Both API + frontend (no Docker)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Get JWT token |
| `GET` | `/auth/me` | Token | Get current user |
| `GET` | `/auth/storage` | Token | Storage used / limit |
| `POST` | `/auth/change-password` | Token | Change password |
| `POST` | `/upload` | Token | Upload file |
| `POST` | `/sharex/upload` | Token | ShareX upload |
| `GET` | `/sharex/config` | Token | Download ShareX config |
| `GET` | `/files?page=1&limit=50` | Token | List user files |
| `GET` | `/file/:filename` | No | Serve file (public) |
| `DELETE` | `/file/:id` | Token | Delete file |
| `GET` | `/admin/users` | Admin | List all users |
| `PATCH` | `/admin/users/:id` | Admin | Edit user |
| `DELETE` | `/admin/users/:id` | Admin | Delete user + files |
| `POST` | `/admin/db` | Admin | Raw SQL editor |
| `GET` | `/admin/db/tables` | Admin | Table schema browser |

## License

UNLICENSED
