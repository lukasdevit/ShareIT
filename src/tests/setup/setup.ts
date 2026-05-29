import { beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../../app.js";
import { closeDb, db } from "../../db/index.js";
import type { FastifyInstance } from "fastify";

export let app: FastifyInstance;
export let request: ReturnType<typeof supertest>;
export let adminToken: string;
export let userToken: string;
export let userId: number;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);

  // Create admin
  const a = await request
    .post("/auth/register")
    .send({ username: "admin-test", password: "adminpass123" });
  adminToken = a.body.token;
  await new Promise<void>((resolve) => {
    db.run(`UPDATE users SET is_admin = 1 WHERE username = ?`, ["admin-test"], () => resolve());
  });

  const relogin = await request
    .post("/auth/login")
    .send({ username: "admin-test", password: "adminpass123" });
  adminToken = relogin.body.token;

  // Create regular user
  const u = await request
    .post("/auth/register")
    .send({ username: "regular-user", password: "userpass123" });
  userToken = u.body.token;
  userId = u.body.user.id;
});

afterAll(async () => {
  await app.close();
  closeDb();
});
