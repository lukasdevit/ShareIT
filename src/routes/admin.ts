import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { db } from "../db/database.js";
import { requireAdmin } from "./auth.js";
import { getStorage } from "../services/storage.js";
import { UPLOAD_DIR, B2_ENABLED, B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_PREFIX, DEFAULT_STORAGE_LIMIT } from "../config/index.js";

const BCRYPT_ROUNDS = 10;

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  storage_limit: number;
  is_admin: number;
}

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require admin authentication
  app.addHook("preHandler", requireAdmin);

  // List all users with file count and storage used (paginated, searchable)
  app.get("/admin/users", async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; search?: string };
    const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "25", 10) || 25));
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || "";

    const searchFilter = search ? `WHERE u.username LIKE ?` : "";
    const searchParam = search ? `%${search}%` : null;

    return new Promise((resolve) => {
      const countParams = searchParam ? [searchParam] : [];
      db.get(
        `SELECT COUNT(*) AS total FROM users u ${searchFilter}`,
        countParams,
        (err, row: { total: number } | undefined) => {
          if (err) { reply.code(500).send({ error: err.message }); resolve(undefined); return; }
          const total = row?.total ?? 0;
          const listParams = searchParam ? [searchParam, limit, offset] : [limit, offset];
          db.all(
            `SELECT 
              u.id, u.username, u.created_at, u.storage_limit, u.is_admin,
              COALESCE(SUM(f.size), 0) AS used,
              COUNT(f.id) AS file_count
             FROM users u
             LEFT JOIN files f ON f.user_id = u.id
             ${searchFilter}
             GROUP BY u.id
             ORDER BY u.id
             LIMIT ? OFFSET ?`,
            listParams,
            (err2, rows) => {
              if (err2) {
                reply.code(500).send({ error: err2.message });
              } else {
                reply.send({ users: rows, total, page, totalPages: Math.ceil(total / limit) });
              }
              resolve(undefined);
            }
          );
        }
      );
    });
  });

  // Update a user (storage_limit, is_admin, or reset password)
  app.patch("/admin/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { storage_limit, is_admin, new_password } = request.body as {
      storage_limit?: number;
      is_admin?: boolean;
      new_password?: string;
    };

    // Build dynamic update
    const sets: string[] = [];
    const values: (number | string)[] = [];

    if (storage_limit !== undefined) {
      if (storage_limit < 0) {
        return reply.code(400).send({ error: "Storage limit cannot be negative" });
      }
      sets.push("storage_limit = ?");
      values.push(storage_limit);
    }

    if (is_admin !== undefined) {
      sets.push("is_admin = ?");
      values.push(is_admin ? 1 : 0);
    }

    if (new_password !== undefined) {
      if (new_password.length < 6) {
        return reply.code(400).send({ error: "New password must be at least 6 chars" });
      }
      const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
      sets.push("password_hash = ?");
      values.push(hash);
    }

    if (sets.length === 0) {
      return reply.code(400).send({ error: "No fields to update" });
    }

    values.push(id);

    return new Promise((resolve) => {
      db.run(
        `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
        values,
        function (err) {
          if (err) {
            reply.code(500).send({ error: err.message });
          } else if (this.changes === 0) {
            reply.code(404).send({ error: "User not found" });
          } else {
            reply.send({ ok: true });
          }
          resolve(undefined);
        }
      );
    });
  });

  // Delete a user and all their files
  app.delete("/admin/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);
    const currentUser = request.user!;

    if (userId === currentUser.id) {
      return reply.code(400).send({ error: "Cannot delete yourself" });
    }

    return new Promise((resolve) => {
      // Get user's files first to delete from disk
      db.all(
        `SELECT path FROM files WHERE user_id = ?`,
        [userId],
        (err, rows: { path: string }[]) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }

          // Delete files from storage — chain async work then resolve
          (async () => {
            for (const row of rows) {
              try { await deleteFromStorage(row.path); } catch (err) {
                console.error("Storage delete failed:", (err as Error).message);
              }
            }
            db.run(`DELETE FROM files WHERE user_id = ?`, [userId]);
            db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err2) {
            if (err2) {
              reply.code(500).send({ error: err2.message });
            } else if (this.changes === 0) {
              reply.code(404).send({ error: "User not found" });
            } else {
              reply.send({ ok: true, files_deleted: rows.length });
            }
            resolve(undefined);
          });
          })();
        }
      );
    });
  });

  // Execute raw SQL
  app.post("/admin/db", async (request, reply) => {
    const { sql } = request.body as { sql?: string };

    if (!sql || !sql.trim()) {
      return reply.code(400).send({ error: "SQL query required" });
    }

    const trimmed = sql.trim();

    // Block destructive operations on system tables
    const upper = trimmed.toUpperCase();
    if (
      (upper.includes("DROP") && upper.includes("TABLE")) ||
      upper.startsWith("VACUUM") ||
      upper.startsWith("REINDEX") ||
      upper.startsWith("ATTACH") ||
      upper.startsWith("DETACH")
    ) {
      return reply.code(403).send({ error: "Destructive DDL not allowed via editor" });
    }

    const isRead = /^(SELECT|PRAGMA|EXPLAIN|WITH|DESCRIBE)\b/i.test(trimmed);

    if (isRead) {
      return new Promise((resolve) => {
        db.all(trimmed, (err, rows) => {
          if (err) {
            reply.code(400).send({ error: err.message });
          } else {
            // Extract column names from first row keys
            const rows_ = rows as Record<string, unknown>[] | undefined;
            const columns = rows_ && rows_.length > 0 ? Object.keys(rows_[0]) : [];
            reply.send({ type: "read", columns, rows, rowCount: rows?.length ?? 0 });
          }
          resolve(undefined);
        });
      });
    }

    // Write query
    return new Promise((resolve) => {
      db.run(trimmed, function (err) {
        if (err) {
          reply.code(400).send({ error: err.message });
          resolve(undefined);
        } else {
          // After any write, check we still have at least one admin
          db.get(`SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`, (err2, row: { cnt: number } | undefined) => {
            const result: { type: string; changes: number; lastID: number; warning?: string } = {
              type: "write",
              changes: this.changes,
              lastID: this.lastID,
            };
            if (!err2 && row && row.cnt === 0) {
              result.warning = "⚠️ No admin users remain! Grant admin to at least one user.";
            }
            reply.send(result);
            resolve(undefined);
          });
        }
      });
    });
  });

  // Get all tables with their schemas
  app.get("/admin/db/tables", async (_request, reply) => {
    return new Promise((resolve) => {
      db.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
        (err, tables: { name: string }[]) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }

          const results: { name: string; columns: { name: string; type: string; notnull: number; pk: number }[]; rowCount: number }[] = [];
          let completed = 0;

          if (tables.length === 0) {
            reply.send([]);
            resolve(undefined);
            return;
          }

          for (const table of tables) {
            db.all(`PRAGMA table_info(${table.name})`, (err2, cols) => {
              if (!err2) {
                db.get(`SELECT COUNT(*) AS count FROM "${table.name}"`, (err3, row: { count: number }) => {
                  results.push({
                    name: table.name,
                    columns: (cols as { name: string; type: string; notnull: number; pk: number }[]).map((c) => ({
                      name: c.name,
                      type: c.type,
                      notnull: c.notnull,
                      pk: c.pk,
                    })),
                    rowCount: row?.count ?? 0,
                  });
                  completed++;
                  if (completed === tables.length) {
                    results.sort((a, b) => a.name.localeCompare(b.name));
                    reply.send(results);
                    resolve(undefined);
                  }
                });
              } else {
                completed++;
                if (completed === tables.length) {
                  results.sort((a, b) => a.name.localeCompare(b.name));
                  reply.send(results);
                  resolve(undefined);
                }
              }
            });
          }
        }
      );
    });
  });

  // Storage config & stats
  app.get("/admin/storage", async (_request, reply) => {
    // Read DB overrides
    const overrides: Record<string, string> = {};
    await new Promise<void>((resolve) => {
      db.all(`SELECT key, value FROM settings`, (err, rows: { key: string; value: string }[] | undefined) => {
        if (!err && rows) rows.forEach((r) => { overrides[r.key] = r.value; });
        resolve();
      });
    });

    return new Promise((resolve) => {
      db.get(
        `SELECT COUNT(*) AS users, COALESCE(SUM(size), 0) AS total_bytes, COUNT(files.id) AS total_files
         FROM users LEFT JOIN files ON files.user_id = users.id`,
        (err, row: { users: number; total_bytes: number; total_files: number } | undefined) => {
          if (err) { reply.code(500).send({ error: err.message }); resolve(undefined); return; }

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
            } catch {
              config.disk_total = 0;
              config.disk_used = 0;
              config.disk_free = 0;
            }
          }

          reply.send({
            ...config,
            users: row?.users ?? 0,
            total_bytes: row?.total_bytes ?? 0,
            total_files: row?.total_files ?? 0,
          });
          resolve(undefined);
        }
      );
    });
  });

  // Update storage settings
  app.patch("/admin/storage", async (request, reply) => {
    const body = request.body as Record<string, string>;
    const allowed = ["b2_endpoint", "b2_region", "b2_bucket", "b2_prefix", "backend"];
    const updates: [string, string][] = [];

    for (const [k, v] of Object.entries(body)) {
      if (allowed.includes(k) && typeof v === "string" && v.trim()) {
        updates.push([k, v.trim()]);
      }
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: "No valid fields to update" });
    }

    for (const [k, v] of updates) {
      await new Promise<void>((res) => {
        db.run(
          `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [k, v],
          () => res()
        );
      });
    }

    return reply.send({ ok: true, updated: updates.map(([k]) => k) });
  });

  // SSL / domain info
  app.get("/admin/ssl", async (request, reply) => {
    const domain = process.env.DOMAIN || "localhost";
    const isLocal = domain === "localhost";
    const proto = (request.headers["x-forwarded-proto"] as string) || "http";

    // Check Caddy cert volume for certificate
    let certExpiry: string | null = null;
    let certValid = false;
    try {
      const certDir = "/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory";
      if (fs.existsSync(certDir)) {
        const entries = fs.readdirSync(certDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && e.name.includes(domain)) {
            const certPath = path.join(certDir, e.name, `${e.name}.crt`);
            if (fs.existsSync(certPath)) {
              certValid = true;
              try {
                const { execSync } = await import("child_process");
                const expiry = execSync(`openssl x509 -enddate -noout -in "${certPath}" 2>/dev/null`, { encoding: "utf8" }).trim();
                certExpiry = expiry.replace("notAfter=", "");
              } catch { certExpiry = "Unknown"; }
            }
          }
        }
      }
    } catch { /* cert check unavailable */ }

    return reply.send({
      domain,
      is_local: isLocal,
      protocol: proto,
      cert_valid: certValid,
      cert_expiry: certExpiry,
      managed_by: isLocal ? "None (localhost)" : "Caddy + Let's Encrypt (auto-renewing)",
      note: isLocal
        ? "SSL is not available on localhost. Deploy with a real domain to get automatic HTTPS."
        : "Caddy automatically obtains and renews SSL certificates. No manual configuration needed.",
    });
  });
}

async function deleteFromStorage(storageKey: string): Promise<void> {
  if (path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)) {
    try { fs.unlinkSync(storageKey); } catch { /* */ }
    return;
  }
  await getStorage().delete(storageKey);
}
