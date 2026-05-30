import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { parsePagination, deleteFromStorage } from '../../utils/index.js';
import { DEFAULT_STORAGE_LIMIT } from '../../config/index.js';
import { recordAction } from '../../services/actionLogService.js';
import { clearConfigCache } from '../../config/index.js';
import { getSetting, upsertSetting } from '../../repositories/settingsRepository.js';
import {
  insertUser,
  countUsersFiltered,
  listUsersWithStats,
  updateUser,
  unlockUser,
  deleteUser,
} from '../../repositories/userRepository.js';
import {
  findFilePathsByUserId,
  deleteFilesByUserId,
} from '../../repositories/fileRepository.js';

const BCRYPT_ROUNDS = 10;

export async function adminUserRoutes(app: FastifyInstance) {
  // ── Demo registrations config ──

  app.get('/admin/users/demo-config', async (_request, reply) => {
    const value = await getSetting('demo_registrations_open');
    const open = value ? value !== 'false' : true;
    return reply.send({ demo_registrations_open: open });
  });

  app.patch('/admin/users/demo-config', async (request, reply) => {
    const { demo_registrations_open } = (request.body || {}) as {
      demo_registrations_open?: boolean;
    };
    if (typeof demo_registrations_open !== 'boolean') {
      return reply
        .code(400)
        .send({ error: 'demo_registrations_open must be a boolean' });
    }
    await upsertSetting('demo_registrations_open', String(demo_registrations_open));
    clearConfigCache();
    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'demo-config',
        `Demo registrations ${demo_registrations_open ? 'enabled' : 'disabled'}`,
        { demo_registrations_open }
      );
    }
    return reply.send({ ok: true, demo_registrations_open });
  });

  // ── User CRUD ──
  const createUserSchema = {
    body: {
      type: 'object' as const,
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 3 },
        password: { type: 'string', minLength: 6 },
        is_admin: { type: 'boolean' },
        storage_limit: { type: 'number', minimum: 1 },
      },
    },
  };

  const patchUserSchema = {
    body: {
      type: 'object' as const,
      minProperties: 1,
      properties: {
        storage_limit: { type: 'number', minimum: 0 },
        is_admin: { type: 'boolean' },
        new_password: { type: 'string', minLength: 6 },
      },
    },
  };

  // Create a new user
  app.post(
    '/admin/users',
    { schema: createUserSchema },
    async (request, reply) => {
      const { username, password, is_admin, storage_limit } = request.body as {
        username: string;
        password: string;
        is_admin?: boolean;
        storage_limit?: number;
      };

      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const limit =
        storage_limit && storage_limit > 0
          ? storage_limit
          : DEFAULT_STORAGE_LIMIT;

      try {
        const id = await insertUser({
          username,
          passwordHash: hash,
          storageLimit: limit,
          isAdmin: !!is_admin,
        });
        if (request.user?.username) {
          await recordAction(
            request.user!.username,
            'user-create',
            `Created user: ${username}`,
            { userId: id, username, isAdmin: !!is_admin }
          );
        }
        return reply.send({
          id,
          username,
          is_admin: !!is_admin,
          storage_limit: limit,
        });
      } catch (err) {
        if ((err as Error).message.includes('UNIQUE')) {
          return reply.code(409).send({ error: 'Username already taken' });
        }
        throw err;
      }
    }
  );

  app.get('/admin/users', async (request, reply) => {
    const { page, limit, offset, search } = parsePagination(
      request.query as Record<string, string>
    );
    const [total, users] = await Promise.all([
      countUsersFiltered(search),
      listUsersWithStats(limit, offset, search),
    ]);
    return reply.send({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  });

  app.patch(
    '/admin/users/:id',
    { schema: patchUserSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { storage_limit, is_admin, new_password } = request.body as {
        storage_limit?: number;
        is_admin?: boolean;
        new_password?: string;
      };

      const passwordHash = new_password
        ? await bcrypt.hash(new_password, BCRYPT_ROUNDS)
        : undefined;

      const changes = await updateUser(parseInt(id, 10), {
        storageLimit: storage_limit,
        isAdmin: is_admin,
        passwordHash,
      });

      if (changes === 0)
        return reply.code(404).send({ error: 'User not found' });

      if (request.user?.username) {
        const changed: Record<string, unknown> = {};
        if (storage_limit !== undefined) changed.storage_limit = storage_limit;
        if (is_admin !== undefined) changed.is_admin = is_admin;
        if (new_password !== undefined) changed.password_changed = true;
        await recordAction(
          request.user!.username,
          'user-edit',
          `Edited user #${id}`,
          { userId: Number(id), changes: changed }
        );
      }
      return reply.send({ ok: true });
    }
  );

  app.post('/admin/users/:id/unlock', async (request, reply) => {
    const userId = Number((request.params as { id: string }).id);
    const changes = await unlockUser(userId);
    if (changes === 0)
      return reply.code(404).send({ error: 'User not found' });
    return reply.send({ ok: true });
  });

  app.delete('/admin/users/:id', async (request, reply) => {
    const userId = Number((request.params as { id: string }).id);
    if (userId === request.user!.id)
      return reply.code(400).send({ error: 'Cannot delete yourself' });

    const files = await findFilePathsByUserId(userId);
    for (const f of files) {
      try {
        await deleteFromStorage(f.path);
      } catch (err) {
        console.error('Storage delete failed:', (err as Error).message);
      }
    }
    await deleteFilesByUserId(userId);
    const changes = await deleteUser(userId);
    if (changes === 0)
      return reply.code(404).send({ error: 'User not found' });
    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'user-delete',
        `Deleted user #${userId}`,
        { userId, filesDeleted: files.length }
      );
    }
    return reply.send({ ok: true, files_deleted: files.length });
  });
}
