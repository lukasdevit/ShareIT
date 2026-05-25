import type { FastifyInstance } from "fastify";
import { dbAll, dbGet, dbRun } from "./helpers.js";

export async function adminDbRoutes(app: FastifyInstance) {
  app.post("/admin/db", async (request, reply) => {
    const { sql } = request.body as { sql?: string };
    if (!sql?.trim()) return reply.code(400).send({ error: "SQL query required" });

    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();
    if ((upper.includes("DROP") && upper.includes("TABLE")) || upper.startsWith("VACUUM") ||
        upper.startsWith("REINDEX") || upper.startsWith("ATTACH") || upper.startsWith("DETACH")) {
      return reply.code(403).send({ error: "Destructive DDL not allowed" });
    }

    const isRead = /^(SELECT|PRAGMA|EXPLAIN|WITH|DESCRIBE)\b/i.test(trimmed);
    try {
      if (isRead) {
        const rows = await dbAll<Record<string, unknown>>(trimmed);
        const firstRow = rows[0];
        const columns = firstRow ? Object.keys(firstRow) : [];
        return reply.send({ type: "read", columns, rows, rowCount: rows.length });
      }

      const result = await dbRun(trimmed);
      const adminCheck = await dbGet<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`);
      const res: { type: string; changes: number; lastID: number; warning?: string } = {
        type: "write", changes: result.changes, lastID: result.lastID,
      };
      if (adminCheck && adminCheck.cnt === 0) {
        res.warning = "⚠️ No admin users remain! Grant admin to at least one user.";
      }
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get("/admin/db/tables", async (_request, reply) => {
    const tables = await dbAll<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    );
    if (tables.length === 0) return reply.send([]);

    const results = await Promise.all(tables.map(async (table) => {
      const cols = await dbAll<{ name: string; type: string; notnull: number; pk: number }>(
        `PRAGMA table_info(${table.name})`
      );
      const count = await dbGet<{ count: number }>(`SELECT COUNT(*) AS count FROM "${table.name}"`);
      return {
        name: table.name,
        columns: cols.map((c) => ({ name: c.name, type: c.type, notnull: c.notnull, pk: c.pk })),
        rowCount: count?.count ?? 0,
      };
    }));
    results.sort((a, b) => a.name.localeCompare(b.name));
    return reply.send(results);
  });
}
