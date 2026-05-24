import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const BCRYPT_ROUNDS = 10;

interface JwtPayload {
  id: number;
  username: string;
}

function signToken(userId: number, username: string): string {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = getTokenFromHeader(request);
  if (!token) return reply.code(401).send({ error: "Missing token" });
  const payload = verifyToken(token);
  if (!payload) return reply.code(401).send({ error: "Invalid or expired token" });
  (request as any).user = payload;
}

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post("/auth/register", async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required" });
    }
    if (username.length < 3 || password.length < 6) {
      return reply.code(400).send({ error: "Username min 3 chars, password min 6 chars" });
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
            const token = signToken(this.lastID, username);
            reply.send({ token, user: { id: this.lastID, username } });
          }
          resolve(undefined);
        }
      );
    });
  });

  // Login
  app.post("/auth/login", async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required" });
    }

    return new Promise((resolve) => {
      db.get(
        `SELECT id, username, password_hash FROM users WHERE username = ?`,
        [username],
        async (err, row: { id: number; username: string; password_hash: string } | undefined) => {
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

          const match = await bcrypt.compare(password, row.password_hash);
          if (!match) {
            reply.code(401).send({ error: "Invalid credentials" });
            resolve(undefined);
            return;
          }

          const token = signToken(row.id, row.username);
          reply.send({ token, user: { id: row.id, username: row.username } });
          resolve(undefined);
        }
      );
    });
  });

  // Current user
  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as JwtPayload;
    return reply.send({ user });
  });
}
