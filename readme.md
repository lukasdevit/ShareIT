# ShareIT

Self-hosted file upload & sharing with ShareX support, B2 cloud storage, and admin panel.

**Live demo**: [goletz.dev](https://goletz.dev)

## Features

- Drag & drop uploads with image gallery and lightbox
- ShareX integration — one-click screenshot → uploaded → link copied
- Public/private file toggle with lock icons
- User accounts with JWT auth + rate limiting + login lockout
- Admin panel: user management, SQL editor, table browser
- Backblaze B2 cloud storage with streaming multipart uploads
- Pagination, copy-to-clipboard, text file viewer
- HTTPS via Caddy (auto Let's Encrypt)
- Docker health checks + DB backup script

## Quick Start

```bash
git clone https://github.com/lukasdevit/projectS.git
cd projectS
cp .env.example .env
# Generate JWT secret: openssl rand -hex 32
# Paste into .env as JWT_SECRET=<value>

# Dev (hot reload)
docker compose -f docker-compose.dev.yml up -d

# Production (Caddy HTTPS)
DOMAIN=yourdomain.com docker compose up -d --build
```

Default admin: `admin` / `admin123`. Open `http://localhost:3001` (dev) or `https://yourdomain.com` (prod).

## Configuration

All settings in `src/config/index.ts`. Secrets in `.env`:

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Yes | `openssl rand -hex 32` |
| `ADMIN_USERNAME` | No | Default `admin` |
| `ADMIN_PASSWORD` | No | Default `admin123` |
| `B2_ENABLED` | No | `true` for cloud storage |
| `B2_ENDPOINT` | For B2 | e.g. `https://s3.eu-central-003.backblazeb2.com` |
| `B2_KEY_ID` | For B2 | Backblaze app key ID |
| `B2_APP_KEY` | For B2 | Backblaze app key |
| `B2_BUCKET` | For B2 | Bucket name |
| `B2_PREFIX` | No | Default `ShareIt/uploads/` |
| `DOMAIN` | For HTTPS | Your domain |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Get JWT |
| `GET` | `/auth/me` | Token | Current user |
| `GET` | `/auth/storage` | Token | Storage used/limit |
| `POST` | `/auth/change-password` | Token | Change password |
| `POST` | `/upload` | Token | Upload file |
| `POST` | `/sharex/upload` | Token | ShareX upload |
| `GET` | `/sharex/config` | Token | ShareX config file |
| `GET` | `/files?page=1&limit=50` | Token | File list (paginated) |
| `PATCH` | `/file/:id` | Token | Toggle public/private |
| `GET` | `/file/:filename` | No* | Serve file |
| `DELETE` | `/file/:id` | Token | Delete file |
| `GET` | `/admin/users` | Admin | User list |
| `PATCH` | `/admin/users/:id` | Admin | Edit user |
| `DELETE` | `/admin/users/:id` | Admin | Delete user |
| `POST` | `/admin/db` | Admin | SQL editor |
| `GET` | `/health` | No | Uptime check |

*Public files accessible by anyone. Private files require owner auth.

## Tech Stack

Fastify + Next.js 15 + SQLite + Tailwind + Docker + Caddy

57 tests | GitHub Actions CI | Node 22

## License

MIT
