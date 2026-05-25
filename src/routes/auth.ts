import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import {
  AUTH_LOGIN_LIMIT, AUTH_REGISTER_LIMIT,
  AUTH_RATE_WINDOW_MS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES,
} from "../config/index.js";
import {
  requireAuth, signToken,
} from "../middleware/index.js";

const BCRYPT_ROUNDS = 10;

// Re-export for backward compatibility (used by other routes)
export { requireAuth, verifyToken, getTokenFromHeader } from "../middleware/index.js";

export async function authRoutes(app: FastifyInstance) {
  // Skip per-route rate limits during tests
  const isTest = (process.env.DB_PATH || "").includes("test");

  // Register — strict rate limit: 3 per minute
  app.post("/auth/register", isTest ? {} : { config: { rateLimit: { max: AUTH_REGISTER_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }, async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required" });
    }
    if (username.length < 3 || password.length < 6) {
      return reply.code(400).send({ error: "Username min 3 chars, password min 6 chars" });
    }

    // Check if registrations are disabled by admin
    if (!isTest) {
      const regSetting = await new Promise<{ value: string } | undefined>((resolve) => {
        db.get(`SELECT value FROM settings WHERE key = 'registrations_open'`, (err, row: { value: string } | undefined) => {
          resolve(err ? undefined : row);
        });
      });
      if (regSetting && regSetting.value === "false") {
        return reply.code(403).send({ error: "Registrations are currently disabled" });
      }
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return new Promise((resolve) => {
      db.run(
        `INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`,
        [username, hash, new Date().toISOString()],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE")) {
              reply.code(409).send({ error: "Username already taken" });
            } else {
              reply.code(500).send({ error: err.message });
            }
          } else {
            const token = signToken(this.lastID, username, false);
            reply.send({ token, user: { id: this.lastID, username, isAdmin: false } });
          }
          resolve(undefined);
        }
      );
    });
  });

  // Login — strict rate limit: 5 per minute
  app.post("/auth/login", isTest ? {} : { config: { rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }, async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required" });
    }

    return new Promise((resolve) => {
      db.get(
        `SELECT id, username, password_hash, is_admin, failed_logins, locked_until FROM users WHERE username = ?`,
        [username],
        async (err, row: { id: number; username: string; password_hash: string; is_admin: number; failed_logins: number; locked_until: string | null } | undefined) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }
          if (!row) {
            reply.code(401).send({ error: "Invalid credentials" });
            resolve(undefined);
            return;
          }

          // Check if account is locked
          if (row.locked_until && new Date(row.locked_until) > new Date()) {
            const remaining = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
            reply.code(429).send({ error: `Account locked. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.` });
            resolve(undefined);
            return;
          }

          const match = await bcrypt.compare(password, row.password_hash);
          if (!match) {
            // Increment failed logins, lock after threshold
            const newCount = row.failed_logins + 1;
            const lockedUntil = newCount >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
              : null;
            await new Promise<void>((res) => {
              db.run(
                `UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?`,
                [newCount, lockedUntil, row.id],
                () => res()
              );
            });
            const attemptsLeft = MAX_FAILED_LOGINS - newCount;
            const msg = attemptsLeft > 0
              ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`
              : `Account locked for ${LOCKOUT_MINUTES} minutes.`;
            reply.code(401).send({ error: msg });
            resolve(undefined);
            return;
          }

          // Successful login — reset counter
          db.run(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?`, [row.id]);

          const isAdmin = row.is_admin === 1;
          const token = signToken(row.id, row.username, isAdmin);
          reply.send({ token, user: { id: row.id, username: row.username, isAdmin } });
          resolve(undefined);
        }
      );
    });
  });

  // Current user
  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    return reply.send({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  });

  // Change password
  app.post("/auth/change-password", { preHandler: [requireAuth], ...(isTest ? {} : { config: { rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }) }, async (request, reply) => {
    const user = request.user!;
    const { currentPassword, newPassword } = request.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: "Current and new password required" });
    }
    if (newPassword.length < 6) {
      return reply.code(400).send({ error: "New password must be at least 6 chars" });
    }

    return new Promise((resolve) => {
      db.get(
        `SELECT password_hash FROM users WHERE id = ?`,
        [user.id],
        async (err, row: { password_hash: string } | undefined) => {
          if (err || !row) {
            reply.code(err ? 500 : 404).send({ error: err?.message || "User not found" });
            resolve(undefined);
            return;
          }

          const match = await bcrypt.compare(currentPassword, row.password_hash);
          if (!match) {
            reply.code(401).send({ error: "Current password is incorrect" });
            resolve(undefined);
            return;
          }

          const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
          db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, user.id], (err2) => {
            if (err2) {
              reply.code(500).send({ error: err2.message });
            } else {
              reply.send({ ok: true });
            }
            resolve(undefined);
          });
        }
      );
    });
  });

  // Storage info
  app.get("/auth/storage", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;

    return new Promise((resolve) => {
      db.get(
        `SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE user_id = ?`,
        [user.id],
        (err, row: { used: number } | undefined) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }
          const used = row?.used ?? 0;
          db.get(
            `SELECT storage_limit FROM users WHERE id = ?`,
            [user.id],
            (err2, userRow: { storage_limit: number } | undefined) => {
              if (err2 || !userRow) {
                reply.code(err2 ? 500 : 404).send({ error: err2?.message || "User not found" });
              } else {
                reply.send({ used, limit: userRow.storage_limit });
              }
              resolve(undefined);
            }
          );
        }
      );
    });
  });
}
