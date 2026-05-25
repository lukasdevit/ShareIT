import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { dbAll, dbGet, dbRun } from "../../db/index.js";
import { UPLOAD_DIR, B2_ENABLED, B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_PREFIX, DEFAULT_STORAGE_LIMIT } from "../../config/index.js";

async function getOverrides(): Promise<Record<string, string>> {
  const overrides: Record<string, string> = {};
  const rows = await dbAll<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  rows.forEach((r) => { overrides[r.key] = r.value; });
  return overrides;
}

export async function adminStorageRoutes(app: FastifyInstance) {
  app.get("/admin/storage", async (_request, reply) => {
    const overrides = await getOverrides();
    const row = await dbGet<{ users: number; total_bytes: number; total_files: number }>(
      `SELECT COUNT(*) AS users, COALESCE(SUM(size), 0) AS total_bytes, COUNT(files.id) AS total_files
       FROM users LEFT JOIN files ON files.user_id = users.id`
    );

    const config: Record<string, unknown> = {
      backend: overrides.backend || (B2_ENABLED ? "b2" : "local"),
      default_storage_limit: DEFAULT_STORAGE_LIMIT,
    };

    if (config.backend === "b2") {
      config.b2_endpoint = overrides.b2_endpoint || B2_ENDPOINT;
      config.b2_region = overrides.b2_region || B2_REGION;
      config.b2_bucket = overrides.b2_bucket || B2_BUCKET;
      config.b2_prefix = overrides.b2_prefix || B2_PREFIX;
    } else {
      try {
        const stats = fs.statfsSync(UPLOAD_DIR);
        config.disk_total = stats.blocks * stats.bsize;
        config.disk_free = stats.bfree * stats.bsize;
        config.disk_used = (config.disk_total as number) - (config.disk_free as number);
      } catch { config.disk_total = 0; config.disk_used = 0; config.disk_free = 0; }
    }

    return reply.send({
      ...config, users: row?.users ?? 0, total_bytes: row?.total_bytes ?? 0, total_files: row?.total_files ?? 0,
    });
  });

  app.patch("/admin/storage", async (request, reply) => {
    const body = request.body as Record<string, string>;
    const allowed = ["b2_endpoint", "b2_region", "b2_bucket", "b2_prefix", "backend"];
    const updates: [string, string][] = [];

    for (const [k, v] of Object.entries(body)) {
      if (allowed.includes(k) && typeof v === "string" && v.trim()) updates.push([k, v.trim()]);
    }
    if (updates.length === 0) return reply.code(400).send({ error: "No valid fields to update" });

    for (const [k, v] of updates) {
      await dbRun(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [k, v]);
    }
    return reply.send({ ok: true, updated: updates.map(([k]) => k) });
  });
}

export async function adminSslRoutes(app: FastifyInstance) {
  app.get("/admin/ssl", async (request, reply) => {
    const domain = process.env.DOMAIN || "localhost";
    const isLocal = domain === "localhost";
    const proto = (request.headers["x-forwarded-proto"] as string) || "http";

    let certExpiry: string | null = null;
    let certValid = false;
    try {
      const certDir = "/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory";
      if (fs.existsSync(certDir)) {
        for (const e of fs.readdirSync(certDir, { withFileTypes: true })) {
          if (e.isDirectory() && e.name.includes(domain)) {
            const certPath = path.join(certDir, e.name, `${e.name}.crt`);
            if (fs.existsSync(certPath)) {
              certValid = true;
              try {
                const { execSync } = await import("child_process");
                certExpiry = execSync(`openssl x509 -enddate -noout -in "${certPath}" 2>/dev/null`, { encoding: "utf8" }).trim().replace("notAfter=", "");
              } catch { certExpiry = "Unknown"; }
            }
          }
        }
      }
    } catch { /* cert check unavailable */ }

    return reply.send({
      domain, is_local: isLocal, protocol: proto, cert_valid: certValid, cert_expiry: certExpiry,
      managed_by: isLocal ? "None (localhost)" : "Caddy + Let's Encrypt (auto-renewing)",
      note: isLocal
        ? "SSL is not available on localhost. Deploy with a real domain to get automatic HTTPS."
        : "Caddy automatically obtains and renews SSL certificates. No manual configuration needed.",
    });
  });
}
