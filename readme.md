![ShareIT](https://healthchecks.io/b/2/85d9c28f-214f-4e72-8332-c72f1a741e73.svg)
# ShareIT

A self-hosted file sharing app you can run on your own server. Upload files, share them with a link, and manage everything from a clean ui.

Think of it as your personal Imgur or Dropbox — but you own the data.

<img src="docs/preview.png" alt="ShareIT screenshot" width="600" />

**Try the live demo:** [shareit.goletz.dev](https://shareit.goletz.dev)

---

## What can it do?

- **Drag & drop to upload** — throw files at it, it just works. Multiple at once, even big ones (up to 1 GB per file).
- **ShareX ready** — one click to generate a ShareX config, then screenshot and upload without thinking about it.
- **Public or private files** — keep stuff to yourself or share a link with anyone.
- **Auto-expiring uploads** — set files to disappear after a few days if you want.
- **Image gallery & file previews** — browse images in a lightbox, preview markdown and text files right in the browser.
- **Dark admin panel** — manage users, browse the database, check analytics, run backups. All from a clean Vercel-style UI that works great on mobile too.
- **Storage quotas** — each user gets a limit, and they can see how much they've used.

Under the hood it covers the basics you'd expect: JWT logins, rate limiting, automatic backups, and HTTPS via Caddy.

---

## How it's built

- **Backend:** Node + Fastify + TypeScript, SQLite for the database
- **Frontend:** Next.js + React + Tailwind CSS
- **Everything runs in Docker** with Caddy handling HTTPS

You can store files on the local disk or point it at Backblaze B2 if you want cloud storage.

---

## Getting started

```bash
git clone https://github.com/lukasdevit/ShareIT.git
cd ShareIT
cp .env.example .env   # fill in your secrets
docker compose -f docker-compose.dev.yml up -d
```

That's it. The frontend will be at [localhost:3001](http://localhost:3001), the API at [localhost:3000](http://localhost:3000). Dev mode gives you hot reload on both.

For production, just use `docker compose up -d` instead, and make sure to:
- Change the default admin password
- Drop your TLS certs into `caddy/certs/`
- Review the rate limits and backup schedule in `.env`

Push to `main` and CI/CD takes over — tests run, a release gets tagged, and it deploys automatically.

---

## License

MIT — do whatever you want with it.
