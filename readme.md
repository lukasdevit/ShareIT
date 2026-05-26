# ShareIT

Self-hosted file sharing app built with Fastify, Next.js and Docker.

Originally started because I was tired of using bloated upload sites and wanted something I fully controlled + worked nicely with ShareX.

Still heavily WIP, but already usable.

<img src="docs/preview.png" alt="ShareIT screenshot" width="600" />

**Live demo:** https://goletz.dev

---

## What it currently does

- drag & drop uploads, normal uploads too
- ShareX support
- public/private files
- image gallery + previews
- admin panel
- expiring files
- local storage or Backblaze B2
- JWT auth
- Docker deployment
- HTTPS through Caddy
- basic rate limiting + login protection

---

## Stack

Backend:
- Node.js
- Fastify
- TypeScript
- SQLite

Frontend:
- Next.js 15
- React 19
- Tailwind

Infra:
- Docker
- Caddy
- GitHub Actions

---

## Why I made it

Mostly as a learning project at first, but it slowly turned into something I actually use daily.

I also wanted to understand:
- file upload pipelines
- auth systems
- reverse proxies
- CI/CD
- cloud object storage
- production deployments
- and many more I didn't knew I will even use in this project.

---

## Architecture

```text
Caddy
 ├── Fastify API
 └── Next.js frontend

API
 ├── SQLite
 ├── local uploads
 └── optional Backblaze B2 storage
```


---

## Running locally

```bash
git clone https://github.com/lukasdevit/ShareIT.git
cd ShareIT

cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
```

Frontend:
```text
localhost:3001
```

API:
```text
localhost:3000
```

---

## Running production

```bash
git clone https://github.com/lukasdevit/ShareIT.git
cd ShareIT

cp .env.example .env
# edit .env with your actual config
docker compose up -d
```

This spins up the API, frontend, and Caddy all at once. Caddy handles SSL automatically — just point a domain at your server and you're good.

A few things worth doing before exposing it to the internet:
- change the default admin password
- set up your storage backend (local path or B2 bucket)
- double-check the rate limiting config in `.env`

---

## Planned stuff

- FOCUS ON UX NOW, it's painful but doable. 
- ~~better mobile UX~~ implement mobile UX at all
- multi-file uploads
- login/register architecture, we will see what I decide to use
- usage analytics
- better search
- dark mode

probably more things once I break production again

---

## Things I learned building this

- handling uploads properly is harder than it looks
- auth edge cases are annoying
- reverse proxies save a lot of headaches
- Docker makes deployment way less painful
- SQLite is actually pretty nice for single-server apps

---

## License

MIT
