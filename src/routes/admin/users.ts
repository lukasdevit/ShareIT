import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { dbAll, dbGet, dbRun } from "../../db/index.js";
import { parsePagination, deleteFromStorage } from "../../utils/index.js";

const BCRYPT_ROUNDS = 10;

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  storage_limit: number;
  is_admin: number;
}

export async function adminUserRoutes(app: FastifyInstance) {
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

  app.patch("/admin/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { storage_limit, is_admin, new_password } = request.body as {
      storage_limit?: number; is_admin?: boolean; new_password?: string;
    };

    const sets: string[] = [];
    const values: (number | string)[] = [];

    if (storage_limit !== undefined) {
      if (storage_limit < 0) return reply.code(400).send({ error: "Storage limit cannot be negative" });
      sets.push("storage_limit = ?"); values.push(storage_limit);
    }
    if (is_admin !== undefined) {
      sets.push("is_admin = ?"); values.push(is_admin ? 1 : 0);
    }
    if (new_password !== undefined) {
      if (new_password.length < 6) return reply.code(400).send({ error: "New password must be at least 6 chars" });
      sets.push("password_hash = ?"); values.push(await bcrypt.hash(new_password, BCRYPT_ROUNDS));
    }
    if (sets.length === 0) return reply.code(400).send({ error: "No fields to update" });

    values.push(id);
    const result = await dbRun(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
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
    return reply.send({ ok: true, files_deleted: files.length });
  });
}
