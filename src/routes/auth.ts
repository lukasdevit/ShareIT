import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { dbGet, dbRun } from "../db/index.js";
import {
  AUTH_LOGIN_LIMIT, AUTH_REGISTER_LIMIT,
  AUTH_RATE_WINDOW_MS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES, DEFAULT_STORAGE_LIMIT,
} from "../config/index.js";
import {
  requireAuth, signToken,
} from "../middleware/index.js";

import { DB_PATH } from "../config/index.js";

const BCRYPT_ROUNDS = 10;

export async function authRoutes(app: FastifyInstance) {
  const isTest = DB_PATH.includes("test");

  // ── Schemas ──

  const registerSchema = {
    body: {
      type: "object" as const,
      required: ["username", "password"],
      properties: {
        username: { type: "string", minLength: 3 },
        password: { type: "string", minLength: 6 },
      },
    },
  };

  const loginSchema = {
    body: {
      type: "object" as const,
      required: ["username", "password"],
      properties: {
        username: { type: "string" },
        password: { type: "string" },
      },
    },
  };

  const changePasswordSchema = {
    body: {
      type: "object" as const,
      required: ["currentPassword", "newPassword"],
      properties: {
        currentPassword: { type: "string" },
        newPassword: { type: "string", minLength: 6 },
      },
    },
  };

  // ── Routes ──

  app.post("/auth/register", {
    schema: registerSchema,
    ...(isTest ? {} : { config: { rateLimit: { max: AUTH_REGISTER_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }),
  }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!isTest) {
      const regSetting = await dbGet<{ value: string }>(`SELECT value FROM settings WHERE key = 'registrations_open'`);
      if (regSetting && regSetting.value === "false") {
        return reply.code(403).send({ error: "Registrations are currently disabled" });
      }
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const result = await dbRun(
        `INSERT INTO users (username, password_hash, created_at, storage_limit) VALUES (?, ?, ?, ?)`,
        [username, hash, new Date().toISOString(), DEFAULT_STORAGE_LIMIT]
      );
      const token = signToken(result.lastID, username, false);
      return reply.send({ token, user: { id: result.lastID, username, isAdmin: false } });
    } catch (err) {
      if ((err as Error).message.includes("UNIQUE")) {
        return reply.code(409).send({ error: "Username already taken" });
      }
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  app.post("/auth/login", {
    schema: loginSchema,
    ...(isTest ? {} : { config: { rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }),
  }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    const row = await dbGet<{ id: number; username: string; password_hash: string; is_admin: number; failed_logins: number; locked_until: string | null }>(
        `SELECT id, username, password_hash, is_admin, failed_logins, locked_until FROM users WHERE username = ?`,
        [username]
      );

      if (!row) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      if (row.locked_until && new Date(row.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
        return reply.code(429).send({ error: `Account locked. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.` });
      }

      const match = await bcrypt.compare(password, row.password_hash);
      if (!match) {
        const newCount = row.failed_logins + 1;
        const lockedUntil = newCount >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null;
        await dbRun(
          `UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?`,
          [newCount, lockedUntil, row.id]
        );
        const attemptsLeft = MAX_FAILED_LOGINS - newCount;
        const msg = attemptsLeft > 0
          ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`
          : `Account locked for ${LOCKOUT_MINUTES} minutes.`;
        return reply.code(401).send({ error: msg });
      }

      await dbRun(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?`, [row.id]);

      const isAdmin = row.is_admin === 1;
      const token = signToken(row.id, row.username, isAdmin);
    return reply.send({ token, user: { id: row.id, username: row.username, isAdmin } });
  });

  // Current user
  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    return reply.send({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  });

  // Change password
  app.post("/auth/change-password", {
    preHandler: [requireAuth],
    schema: changePasswordSchema,
    ...(isTest ? {} : { config: { rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS } } }),
  }, async (request, reply) => {
    const user = request.user!;
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    const row = await dbGet<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = ?`,
      [user.id]
    );
    if (!row) {
      return reply.code(404).send({ error: "User not found" });
    }

    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) {
      return reply.code(401).send({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await dbRun(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, user.id]);
    return reply.send({ ok: true });
  });

  // Storage info
  app.get("/auth/storage", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;

    const [usedRow, userRow] = await Promise.all([
      dbGet<{ used: number }>(`SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE user_id = ?`, [user.id]),
      dbGet<{ storage_limit: number }>(`SELECT storage_limit FROM users WHERE id = ?`, [user.id]),
    ]);
    if (!userRow) {
      return reply.code(404).send({ error: "User not found" });
    }
    return reply.send({ used: usedRow?.used ?? 0, limit: userRow.storage_limit });
  });
}
