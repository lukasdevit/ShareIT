import type { FastifyInstance } from 'fastify';
import { recordAction } from '../../services/action-log-service.js';
import {
  isValidTable,
  listTables,
  browseTable,
  isAdminUser,
  countAdmins,
  findRow,
  deleteRow,
} from '../../repositories/db-repository.js';

export async function adminDbRoutes(app: FastifyInstance) {
  // List tables with schema info
  app.get('/admin/db/tables', async (_request, reply) => {
    const results = await listTables();
    return reply.send(results);
  });

  // Browse rows for a specific table
  app.get('/admin/db/tables/:name/rows', async (request, reply) => {
    const { name } = request.params as { name: string };
    if (!isValidTable(name)) {
      return reply.code(400).send({ error: 'Invalid table name' });
    }
    const data = await browseTable(name);
    return reply.send(data);
  });

  // Delete a single row by primary key
  app.delete(
    '/admin/db/tables/:name/rows',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['pkColumn', 'pkValue'],
          properties: { pkColumn: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { name } = request.params as { name: string };
      if (!isValidTable(name)) {
        return reply.code(400).send({ error: 'Invalid table name' });
      }

      const { pkColumn, pkValue } = request.body as {
        pkColumn: string;
        pkValue: unknown;
      };

      // Prevent deleting the last admin
      if (name === 'users') {
        const isAdmin = await isAdminUser(pkColumn, pkValue);
        if (isAdmin && (await countAdmins()) <= 1) {
          return reply.code(403).send({ error: 'Cannot delete the last admin user' });
        }
      }

      const row = await findRow(name, pkColumn, pkValue);
      const changes = await deleteRow(name, pkColumn, pkValue);

      if (request.user?.username && row) {
        await recordAction(
          request.user!.username,
          'db-delete',
          `Deleted from ${name} where ${pkColumn}=${pkValue}`,
          { table: name, pkColumn, pkValue, row }
        );
      }
      return reply.send({ ok: true, changes });
    }
  );
}
