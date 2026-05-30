import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { dbAll, dbGet, dbRun } from '../../db/index.js';
import {
  UPLOAD_DIR,
  B2_ENDPOINT,
  B2_REGION,
  B2_BUCKET,
  B2_PREFIX,
  DEFAULT_STORAGE_LIMIT,
  DOMAIN,
} from '../../config/index.js';
import { isB2Enabled, getB2KeyId, getB2AppKey, clearConfigCache } from '../../config/index.js';
import { recordAction } from './actions.js';

const STORAGE_RATE_LIMIT = 60; // requests per window
const STORAGE_RATE_WINDOW_MS = 60_000;

async function getOverrides(): Promise<Record<string, string>> {
  const overrides: Record<string, string> = {};
  const rows = await dbAll<{ key: string; value: string }>(
    `SELECT key, value FROM settings`
  );
  rows.forEach((r) => {
    overrides[r.key] = r.value;
  });
  return overrides;
}

export async function adminStorageRoutes(app: FastifyInstance) {
  app.get(
    '/admin/storage',
    {
      config: {
        rateLimit: {
          max: STORAGE_RATE_LIMIT,
          timeWindow: STORAGE_RATE_WINDOW_MS,
        },
      },
    },
    async (_request, reply) => {
      const overrides = await getOverrides();
      const row = await dbGet<{
        users: number;
        total_bytes: number;
        total_files: number;
      }>(
        `SELECT COUNT(DISTINCT users.id) AS users, COALESCE(SUM(size), 0) AS total_bytes, COUNT(files.id) AS total_files
       FROM users LEFT JOIN files ON files.user_id = users.id`
      );

      const config: Record<string, unknown> = {
        backend: overrides.backend || (await isB2Enabled() ? 'b2' : 'local'),
        default_storage_limit: DEFAULT_STORAGE_LIMIT,
        total_storage_limit:
          parseInt(overrides.total_storage_limit || '0', 10) || 0,
      };

      if (config.backend === 'b2') {
        config.b2_endpoint = overrides.b2_endpoint || B2_ENDPOINT;
        config.b2_region = overrides.b2_region || B2_REGION;
        config.b2_bucket = overrides.b2_bucket || B2_BUCKET;
        config.b2_prefix = overrides.b2_prefix || B2_PREFIX;
        config.b2_has_key_id = !!(overrides.b2_key_id || await getB2KeyId());
        config.b2_has_app_key = !!(overrides.b2_app_key || await getB2AppKey());
      } else {
        try {
          const stats = fs.statfsSync(UPLOAD_DIR);
          config.disk_total = stats.blocks * stats.bsize;
          config.disk_free = stats.bfree * stats.bsize;
          config.disk_used =
            (config.disk_total as number) - (config.disk_free as number);
        } catch {
          config.disk_total = 0;
          config.disk_used = 0;
          config.disk_free = 0;
        }
      }

      return reply.send({
        ...config,
        users: row?.users ?? 0,
        total_bytes: row?.total_bytes ?? 0,
        total_files: row?.total_files ?? 0,
        registrations_open: overrides.registrations_open !== 'false',
        s3_upload_enabled: overrides.s3_upload_enabled === 'true',
      });
    }
  );

  app.get('/admin/storage/secrets', async (_request, reply) => {
    const overrides = await getOverrides();
    const keyId = overrides.b2_key_id || await getB2KeyId();
    const appKey = overrides.b2_app_key || await getB2AppKey();
    return reply.send({
      b2_key_id: keyId || '',
      b2_app_key: appKey || '',
    });
  });

  app.patch(
    '/admin/storage',
    {
      config: {
        rateLimit: {
          max: STORAGE_RATE_LIMIT,
          timeWindow: STORAGE_RATE_WINDOW_MS,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, string>;
      const allowed = [
        'b2_endpoint',
        'b2_region',
        'b2_bucket',
        'b2_prefix',
        'b2_key_id',
        'b2_app_key',
        'backend',
        'registrations_open',
        's3_upload_enabled',
        'total_storage_limit',
      ];
      const updates: [string, string][] = [];

      for (const [k, v] of Object.entries(body)) {
        if (allowed.includes(k) && typeof v === 'string' && v.trim())
          updates.push([k, v.trim()]);
      }
      if (updates.length === 0)
        return reply.code(400).send({ error: 'No valid fields to update' });

      for (const [k, v] of updates) {
        await dbRun(
          `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [k, v]
        );
      }
      clearConfigCache();
      if (request.user?.username) {
        await recordAction(
          request.user!.username,
          'storage-config',
          `Updated: ${updates.map(([k]) => k).join(', ')}`,
          { updates: Object.fromEntries(updates) }
        );
      }
      return reply.send({ ok: true, updated: updates.map(([k]) => k) });
    }
  );
}

export async function adminSslRoutes(app: FastifyInstance) {
  app.get('/admin/ssl', async (request, reply) => {
    const domain = DOMAIN;
    const isLocal = domain === 'localhost';
    const proto =
      (request.headers['x-forwarded-proto'] as string) ||
      request.protocol ||
      'http';

    // Caddy sets x-forwarded-proto to "https" when it terminates SSL.
    // In Docker, the API container can't read Caddy's cert store, so we
    // rely on the header rather than filesystem checks.
    const sslActive = proto === 'https';

    // Try to read cert expiry from Caddy's data directory (best-effort).
    // This works in non-Docker setups; in Docker it silently fails.
    let certExpiry: string | null = null;
    if (sslActive) {
      certExpiry = await tryReadCertExpiry(domain);
    }

    const managedBy = isLocal
      ? 'Caddy (self-signed, localhost)'
      : sslActive
        ? "Caddy + Let's Encrypt (auto-renewing)"
        : 'Caddy (no certificate detected)';

    const note = isLocal
      ? 'Caddy auto-generates a self-signed certificate for localhost. Browsers will show a security warning — this is normal for local development.'
      : sslActive
        ? 'Caddy automatically obtains and renews SSL certificates. No manual configuration needed.'
        : 'Caddy is configured but no SSL certificate was detected. Check that port 443 is reachable and DNS points to this server.';

    return reply.send({
      domain,
      is_local: isLocal,
      protocol: proto,
      cert_valid: sslActive,
      cert_expiry: certExpiry,
      managed_by: managedBy,
      note,
    });
  });

  // Upload custom SSL certificate
  app.post('/admin/ssl/cert', async (request, reply) => {
    const { cert, key } = (request.body || {}) as {
      cert?: string;
      key?: string;
    };
    if (!cert || !key) {
      return reply.code(400).send({ error: 'Both cert and key PEM are required' });
    }
    if (!cert.includes('BEGIN CERTIFICATE') || !key.includes('BEGIN')) {
      return reply
        .code(400)
        .send({ error: 'Invalid PEM format. Must include BEGIN/END markers.' });
    }

    const certsDir = path.join(process.cwd(), 'caddy', 'certs');
    fs.mkdirSync(certsDir, { recursive: true });
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert.trim() + '\n');
    fs.writeFileSync(path.join(certsDir, 'key.pem'), key.trim() + '\n');
    fs.writeFileSync(
      path.join(certsDir, 'custom.caddy'),
      `tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem\n`
    );

    // Reload Caddy config via admin API
    try {
      await fetch('http://caddy:2019/load', {
        method: 'POST',
        headers: { 'Content-Type': 'text/caddyfile' },
        body: fs.readFileSync(
          path.join(process.cwd(), 'Caddyfile'),
          'utf8'
        ),
      });
    } catch {
      // Caddy admin API not reachable — cert will apply on next restart
    }

    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'ssl-cert-upload',
        'Custom SSL certificate uploaded'
      );
    }
    return reply.send({ ok: true });
  });

  // Delete custom SSL certificate
  app.delete('/admin/ssl/cert', async (request, reply) => {
    const certsDir = path.join(process.cwd(), 'caddy', 'certs');
    const snippetPath = path.join(certsDir, 'custom.caddy');
    const hadCert = fs.existsSync(snippetPath);

    try {
      if (fs.existsSync(path.join(certsDir, 'cert.pem')))
        fs.unlinkSync(path.join(certsDir, 'cert.pem'));
      if (fs.existsSync(path.join(certsDir, 'key.pem')))
        fs.unlinkSync(path.join(certsDir, 'key.pem'));
      if (fs.existsSync(snippetPath)) fs.unlinkSync(snippetPath);
    } catch {
      return reply.code(500).send({ error: 'Failed to remove cert files' });
    }

    if (hadCert) {
      try {
        await fetch('http://caddy:2019/load', {
          method: 'POST',
          headers: { 'Content-Type': 'text/caddyfile' },
          body: fs.readFileSync(
            path.join(process.cwd(), 'Caddyfile'),
            'utf8'
          ),
        });
      } catch {
        /* Caddy reload will apply on restart */
      }
    }

    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'ssl-cert-delete',
        'Custom SSL certificate removed'
      );
    }
    return reply.send({ ok: true });
  });

  // Check if custom cert is active
  app.get('/admin/ssl/cert', async (_request, reply) => {
    const snippetPath = path.join(process.cwd(), 'caddy', 'certs', 'custom.caddy');
    const certPath = path.join(process.cwd(), 'caddy', 'certs', 'cert.pem');
    const hasCustom = fs.existsSync(snippetPath) && fs.existsSync(certPath);

    let expires: string | null = null;
    if (hasCustom) {
      try {
        const { execSync } = await import('child_process');
        expires = execSync(
          `openssl x509 -enddate -noout -in "${certPath}" 2>/dev/null`,
          { encoding: 'utf8', timeout: 3000 }
        )
          .trim()
          .replace('notAfter=', '');
      } catch {
        expires = 'Unknown';
      }
    }

    return reply.send({ has_custom_cert: hasCustom, cert_expiry: expires });
  });
}

/** Best-effort: try to read the cert expiry from Caddy's cert store. */
async function tryReadCertExpiry(domain: string): Promise<string | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const possibleDirs = [
      '/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory',
      '/data/caddy/certificates/acme-staging-v02.api.letsencrypt.org-directory',
      '/var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory',
    ];

    for (const certDir of possibleDirs) {
      if (!fs.existsSync(certDir)) continue;
      for (const entry of fs.readdirSync(certDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.includes(domain)) continue;
        const certPath = path.join(certDir, entry.name, `${entry.name}.crt`);
        if (!fs.existsSync(certPath)) continue;

        try {
          const { execSync } = await import('child_process');
          return execSync(
            `openssl x509 -enddate -noout -in "${certPath}" 2>/dev/null`,
            { encoding: 'utf8', timeout: 3000 }
          )
            .trim()
            .replace('notAfter=', '');
        } catch {
          return 'Unknown';
        }
      }
    }
  } catch {
    // Cert directory not accessible (expected in Docker)
  }
  return null;
}
