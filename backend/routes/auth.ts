import type { FastifyInstance } from 'fastify';

import { requireAuth, signToken } from '../middleware/index.js';
import { DB_PATH, AUTH_LOGIN_LIMIT, AUTH_REGISTER_LIMIT, AUTH_RATE_WINDOW_MS } from '../config/index.js';
import {
  registerUser,
  loginUser,
  changeUserPassword,
  getUserStorageInfo,
  createDemoAccount,
  cleanupDemoSession,
} from '../services/authService.js';
import { DEMO_IP_RATE_LIMIT, DEMO_RATE_WINDOW_MS } from '../config/index.js';

export async function authRoutes(app: FastifyInstance) {
  const isTest = DB_PATH.includes('test');

  // ── Schemas ──

  const registerSchema = {
    body: {
      type: 'object' as const,
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 3 },
        password: { type: 'string', minLength: 6 },
      },
    },
  };

  const loginSchema = {
    body: {
      type: 'object' as const,
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  };

  const changePasswordSchema = {
    body: {
      type: 'object' as const,
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string', minLength: 6 },
      },
    },
  };

  // ── Register ──

  app.post(
    '/auth/register',
    {
      schema: registerSchema,
      ...(isTest
        ? {}
        : {
            config: {
              rateLimit: { max: AUTH_REGISTER_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS },
            },
          }),
    },
    async (request, reply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      try {
        const user = await registerUser(username, password, isTest);
        const token = signToken(user.id, user.username, user.isAdmin);
        return reply.send({ token, user });
      } catch (err) {
        const e = err as { statusCode?: number; message: string };
        return reply.code(e.statusCode || 500).send({ error: e.message });
      }
    }
  );

  // ── Login ──

  app.post(
    '/auth/login',
    {
      schema: loginSchema,
      ...(isTest
        ? {}
        : {
            config: {
              rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS },
            },
          }),
    },
    async (request, reply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      try {
        const user = await loginUser(username, password);
        const token = signToken(user.id, user.username, user.isAdmin);
        return reply.send({ token, user });
      } catch (err) {
        const e = err as { statusCode?: number; message: string };
        return reply.code(e.statusCode || 500).send({ error: e.message });
      }
    }
  );

  // ── Current user ──

  app.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        isDemo: user.isDemo,
      },
    });
  });

  // ── Change password ──

  app.post(
    '/auth/change-password',
    {
      preHandler: [requireAuth],
      schema: changePasswordSchema,
      ...(isTest
        ? {}
        : {
            config: {
              rateLimit: { max: AUTH_LOGIN_LIMIT, timeWindow: AUTH_RATE_WINDOW_MS },
            },
          }),
    },
    async (request, reply) => {
      const user = request.user!;
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      try {
        await changeUserPassword(user.id, currentPassword, newPassword);
        return reply.send({ ok: true });
      } catch (err) {
        const e = err as { statusCode?: number; message: string };
        return reply.code(e.statusCode || 500).send({ error: e.message });
      }
    }
  );

  // ── Storage info ──

  app.get(
    '/auth/storage',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const info = await getUserStorageInfo(user.id);
      return reply.send(info);
    }
  );

  // ── Demo account ──

  app.post(
    '/auth/demo',
    {
      ...(isTest
        ? {}
        : {
            config: {
              rateLimit: { max: DEMO_IP_RATE_LIMIT, timeWindow: DEMO_RATE_WINDOW_MS },
            },
          }),
    },
    async (request, reply) => {
      try {
        const user = await createDemoAccount(isTest);
        const token = signToken(user.id, user.username, false, true);
        return reply.send({ token, user });
      } catch (err) {
        const e = err as { statusCode?: number; message: string };
        return reply.code(e.statusCode || 500).send({ error: e.message });
      }
    }
  );

  // ── Demo session cleanup ──

  app.post(
    '/auth/demo-session',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      if (!user.isDemo) {
        return reply.code(403).send({ error: 'Not a demo session' });
      }

      try {
        await cleanupDemoSession(user.id);
        return reply.send({ ok: true });
      } catch (err) {
        return reply.code(500).send({ error: (err as Error).message });
      }
    }
  );
}
