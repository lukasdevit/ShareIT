import type { FastifyInstance } from "fastify";
import { dbAll, dbGet, dbRun } from "../../db/index.js";

/** Allowed table names — prevents injection via table name parameter */
const ALLOWED_TABLES = new Set(["users", "files", "settings", "file_tags", "backup_logs"]);

function validateTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

export async function adminDbRoutes(app: FastifyInstance) {
  // List tables with schema info (read-only)
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

  // Browse rows for a specific table (read-only, limited)
  app.get("/admin/db/tables/:name/rows", async (request, reply) => {
    const { name } = request.params as { name: string };
    if (!validateTable(name)) {
      return reply.code(400).send({ error: "Invalid table name" });
    }

    const rows = await dbAll<Record<string, unknown>>(
      `SELECT * FROM "${name}" LIMIT 100`
    );
    const firstRow = rows[0];
    const columns = firstRow ? Object.keys(firstRow) : [];
    return reply.send({ columns, rows, rowCount: rows.length });
  });

  // Delete a single row by primary key value
  app.delete("/admin/db/tables/:name/rows", {
    schema: {
      body: {
        type: "object" as const,
        required: ["pkColumn", "pkValue"],
        properties: {
          pkColumn: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    if (!validateTable(name)) {
      return reply.code(400).send({ error: "Invalid table name" });
    }

    const { pkColumn, pkValue } = request.body as { pkColumn: string; pkValue: unknown };

    // Prevent deleting the last admin
    if (name === "users") {
      const user = await dbGet<{ is_admin: number }>(
        `SELECT is_admin FROM users WHERE "${pkColumn}" = ?`, [pkValue]
      );
      if (user?.is_admin) {
        const adminCount = await dbGet<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`
        );
        if (adminCount && adminCount.cnt <= 1) {
          return reply.code(403).send({ error: "Cannot delete the last admin user" });
        }
      }
    }

    const result = await dbRun(
      `DELETE FROM "${name}" WHERE "${pkColumn}" = ?`, [pkValue]
    );
    return reply.send({ ok: true, changes: result.changes });
  });
}
