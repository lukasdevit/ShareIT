import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_UPLOAD_DIR,
  DEFAULT_STORAGE_LIMIT,
} from '../../config/index.js';
import { getStorageBackend, getStorageSetting, clearConfigCache } from '../../config/index.js';
import { recordAction } from '../../services/action-log-service.js';
import { getAllSettings, upsertSetting } from '../../repositories/settings-repository.js';
import { getStorageStats } from '../../repositories/storage-stats-repository.js';
import { saveCustomCertificate, readSslStatus } from '../../services/storage/ssl-service.js';

const STORAGE_RATE_LIMIT = 60; // requests per window
const STORAGE_RATE_WINDOW_MS = 60_000;

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
      const overrides = await getAllSettings();
      const row = await getStorageStats();

      const config: Record<string, unknown> = {
        backend: overrides.backend || (await getStorageBackend()),
        default_storage_limit: DEFAULT_STORAGE_LIMIT,
        total_storage_limit:
          parseInt(overrides.total_storage_limit || '0', 10) || 0,
      };

      if (config.backend !== 'local') {
        const backend = config.backend as string;
        config[`${backend}_endpoint`] = overrides[`${backend}_endpoint`] || await getStorageSetting('endpoint') || '';
        config[`${backend}_region`] = overrides[`${backend}_region`] || await getStorageSetting('region') || '';
        config[`${backend}_bucket`] = overrides[`${backend}_bucket`] || await getStorageSetting('bucket') || '';
        config[`${backend}_prefix`] = overrides[`${backend}_prefix`] || await getStorageSetting('prefix') || '';
        config[`${backend}_has_key_id`] = !!(overrides[`${backend}_key_id`] || await getStorageSetting('key_id'));
        config[`${backend}_has_app_key`] = !!(overrides[`${backend}_app_key`] || await getStorageSetting('app_key'));
      } else {
        try {
          const stats = fs.statfsSync(DEFAULT_UPLOAD_DIR);
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
        users: row.users,
        total_bytes: row.total_bytes,
        total_files: row.total_files,
        registrations_open: overrides.registrations_open !== 'false',
        s3_upload_enabled: overrides.s3_upload_enabled === 'true',
        backup_retention_days: parseInt(overrides.backup_retention_days || '3', 10) || 3,
      });
    }
  );

  app.get('/admin/storage/secrets', async (_request, reply) => {
    const overrides = await getAllSettings();
    const backend = await getStorageBackend();
    const keyId = overrides[`${backend}_key_id`] || await getStorageSetting('key_id');
    const appKey = overrides[`${backend}_app_key`] || await getStorageSetting('app_key');
    return reply.send({
      [`${backend}_key_id`]: keyId || '',
      [`${backend}_app_key`]: appKey || '',
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
        'storage_path',
        'b2_endpoint',
        'b2_region',
        'b2_bucket',
        'b2_key_id',
        'b2_app_key',
        'backend',
        'registrations_open',
        's3_upload_enabled',
        'total_storage_limit',
        'backup_retention_days',
      ];
      const updates: [string, string][] = [];

      for (const [k, v] of Object.entries(body)) {
        if (allowed.includes(k) && typeof v === 'string' && v.trim())
          updates.push([k, v.trim()]);
      }
      if (updates.length === 0)
        return reply.code(400).send({ error: 'No valid fields to update' });

      for (const [k, v] of updates) {
        await upsertSetting(k, v);
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
    const proto =
      (request.headers['x-forwarded-proto'] as string) ||
      request.protocol ||
      'http';
    const status = await readSslStatus(proto);
    return reply.send(status);
  });

  app.post('/admin/ssl/cert', async (request, reply) => {
    const { cert, key } = (request.body || {}) as {
      cert?: string;
      key?: string;
    };

    try {
      await saveCustomCertificate(cert || '', key || '');
    } catch (err) {
      const e = err as { statusCode?: number; message: string };
      return reply.code(e.statusCode || 400).send({ error: e.message });
    }

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
