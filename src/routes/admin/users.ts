import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { dbAll, dbGet, dbRun } from "../../db/index.js";
import { parsePagination, deleteFromStorage } from "../../utils/index.js";
import { DEFAULT_STORAGE_LIMIT } from "../../config/index.js";
import { recordAction } from "./actions.js";

const BCRYPT_ROUNDS = 10;

export async function adminUserRoutes(app: FastifyInstance) {
  const createUserSchema = {
    body: {
      type: "object" as const,
      required: ["username", "password"],
      properties: {
        username: { type: "string", minLength: 3 },
        password: { type: "string", minLength: 6 },
        is_admin: { type: "boolean" },
        storage_limit: { type: "number", minimum: 1 },
      },
    },
  };

  const patchUserSchema = {
    body: {
      type: "object" as const,
      minProperties: 1,
      properties: {
        storage_limit: { type: "number", minimum: 0 },
        is_admin: { type: "boolean" },
        new_password: { type: "string", minLength: 6 },
      },
    },
  };

  // Create a new user
  app.post("/admin/users", { schema: createUserSchema }, async (request, reply) => {
    const { username, password, is_admin, storage_limit } = request.body as {
      username: string; password: string; is_admin?: boolean; storage_limit?: number;
    };

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const limit = storage_limit && storage_limit > 0 ? storage_limit : DEFAULT_STORAGE_LIMIT;

    try {
      const result = await dbRun(
        `INSERT INTO users (username, password_hash, created_at, is_admin, storage_limit) VALUES (?, ?, ?, ?, ?)`,
        [username, hash, new Date().toISOString(), is_admin ? 1 : 0, limit]
      );
      if (request.user?.username) {
        await recordAction(request.user!.username, "user-create", `Created user: ${username}`, {
          userId: result.lastID, username, isAdmin: !!is_admin,
        });
      }
      return reply.send({ id: result.lastID, username, is_admin: !!is_admin, storage_limit: limit });
    } catch (err) {
      if ((err as Error).message.includes("UNIQUE")) {
        return reply.code(409).send({ error: "Username already taken" });
      }
      throw err;
    }
  });

  app.get("/admin/users", async (request, reply) => {
    const { page, limit, offset, search } = parsePagination(request.query as Record<string, string>);
    const filter = search ? `WHERE u.username LIKE ?` : "";
    const searchParam = search ? `%${search}%` : null;
    const countParams = searchParam ? [searchParam] : [];
    const listParams = searchParam ? [searchParam, limit, offset] : [limit, offset];

    const row = await dbGet<{ total: number }>(`SELECT COUNT(*) AS total FROM users u ${filter}`, countParams);
    const total = row?.total ?? 0;
    const rows = await dbAll(
      `SELECT u.id, u.username, u.created_at, u.storage_limit, u.is_admin,
              COALESCE(SUM(f.size), 0) AS used, COUNT(f.id) AS file_count
       FROM users u LEFT JOIN files f ON f.user_id = u.id ${filter}
       GROUP BY u.id ORDER BY u.id LIMIT ? OFFSET ?`,
      listParams
    );
    return reply.send({ users: rows, total, page, totalPages: Math.ceil(total / limit) });
  });

  app.patch("/admin/users/:id", { schema: patchUserSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { storage_limit, is_admin, new_password } = request.body as {
      storage_limit?: number; is_admin?: boolean; new_password?: string;
    };

    const sets: string[] = [];
    const values: (number | string)[] = [];

    if (storage_limit !== undefined) {
      sets.push("storage_limit = ?"); values.push(storage_limit);
    }
    if (is_admin !== undefined) {
      sets.push("is_admin = ?"); values.push(is_admin ? 1 : 0);
    }
    if (new_password !== undefined) {
      sets.push("password_hash = ?"); values.push(await bcrypt.hash(new_password, BCRYPT_ROUNDS));
    }

    values.push(id);
    const result = await dbRun(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
    if (result.changes === 0) return reply.code(404).send({ error: "User not found" });
    if (request.user?.username) {
      const changed: Record<string, unknown> = {};
      if (storage_limit !== undefined) changed.storage_limit = storage_limit;
      if (is_admin !== undefined) changed.is_admin = is_admin;
      if (new_password !== undefined) changed.password_changed = true;
      await recordAction(request.user!.username, "user-edit", `Edited user #${id}`, { userId: Number(id), changes: changed });
    }
    return reply.send({ ok: true });
  });

  app.post("/admin/users/:id/unlock", async (request, reply) => {
    const userId = Number((request.params as { id: string }).id);
    const result = await dbRun(
      `UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?`,
      [userId]
    );
    if (result.changes === 0) return reply.code(404).send({ error: "User not found" });
    return reply.send({ ok: true });
  });

  app.delete("/admin/users/:id", async (request, reply) => {
    const userId = Number((request.params as { id: string }).id);
    if (userId === request.user!.id) return reply.code(400).send({ error: "Cannot delete yourself" });

    const files = await dbAll<{ path: string }>(`SELECT path FROM files WHERE user_id = ?`, [userId]);
    for (const f of files) {
      try { await deleteFromStorage(f.path); } catch (err) { console.error("Storage delete failed:", (err as Error).message); }
    }
    await dbRun(`DELETE FROM files WHERE user_id = ?`, [userId]);
    const result = await dbRun(`DELETE FROM users WHERE id = ?`, [userId]);
    if (result.changes === 0) return reply.code(404).send({ error: "User not found" });
    if (request.user?.username) {
      await recordAction(request.user!.username, "user-delete", `Deleted user #${userId}`, { userId, filesDeleted: files.length });
    }
    return reply.send({ ok: true, files_deleted: files.length });
  });
}
