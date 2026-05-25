import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../app.js";
import { closeDb } from "../db/database.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;
let adminToken: string;
let userToken: string;
let userId: number;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);

  // Create admin
  const a = await request
    .post("/auth/register")
    .send({ username: "admintest", password: "adminpass123" });
  adminToken = a.body.token;
  const { db } = await import("../db/database.js");
  await new Promise<void>((resolve) => {
    db.run(`UPDATE users SET is_admin = 1 WHERE username = ?`, ["admintest"], () => resolve());
  });
  const relogin = await request
    .post("/auth/login")
    .send({ username: "admintest", password: "adminpass123" });
  adminToken = relogin.body.token;

  // Create regular user
  const u = await request
    .post("/auth/register")
    .send({ username: "testvictim", password: "testpass123" });
  userToken = u.body.token;
  userId = u.body.user.id;
});

afterAll(async () => {
  await app.close();
  closeDb();
});

describe("GET /admin/users", () => {
  it("returns list of users with stats", async () => {
    const res = await request
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("totalPages");

    const victim = res.body.users.find((u: any) => u.username === "testvictim");
    expect(victim).toBeDefined();
    expect(victim).toHaveProperty("file_count");
    expect(victim).toHaveProperty("used");
    expect(victim).toHaveProperty("storage_limit");
    expect(victim).toHaveProperty("is_admin");
  });

  it("rejects non-admin users", async () => {
    await request
      .get("/admin/users")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });
});

describe("PATCH /admin/users/:id", () => {
  it("updates storage limit", async () => {
    const res = await request
      .patch(`/admin/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ storage_limit: 5368709120 }) // 5 GB
      .expect(200);
    expect(res.body.ok).toBe(true);

    // Verify via list
    const list = await request
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    const u = list.body.users.find((u: any) => u.id === userId);
    expect(u.storage_limit).toBe(5368709120);
  });

  it("toggles admin status", async () => {
    await request
      .patch(`/admin/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ is_admin: true })
      .expect(200);

    const list = await request
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    const u = list.body.users.find((u: any) => u.id === userId);
    expect(u.is_admin).toBe(1);
  });

  it("resets user password", async () => {
    await request
      .patch(`/admin/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ new_password: "resetpass999" })
      .expect(200);

    // Verify new password works
    const login = await request
      .post("/auth/login")
      .send({ username: "testvictim", password: "resetpass999" });
    expect(login.status).toBe(200);
  });

  it("rejects invalid storage limit", async () => {
    const res = await request
      .patch(`/admin/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ storage_limit: -1 })
      .expect(400);
    expect(res.body.error).toContain("negative");
  });
});

describe("DELETE /admin/users/:id", () => {
  it("prevents admin from deleting themselves", async () => {
    // Get admin's own ID
    const me = await request
      .get("/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    const myId = me.body.user.id;

    const res = await request
      .delete(`/admin/users/${myId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);
    expect(res.body.error).toContain("delete yourself");
  });

  it("deletes a user and their files", async () => {
    // Create a disposable user
    const r = await request
      .post("/auth/register")
      .send({ username: "disposable", password: "testpass123" });
    const dispId = r.body.user.id;

    const res = await request
      .delete(`/admin/users/${dispId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.ok).toBe(true);

    // Verify user is gone from listing
    const list = await request
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    const stillThere = list.body.users.find((u: any) => u.id === dispId);
    expect(stillThere).toBeUndefined();
  });
});

describe("POST /admin/db", () => {
  it("executes a SELECT query", async () => {
    const res = await request
      .post("/admin/db")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "SELECT COUNT(*) AS cnt FROM users" })
      .expect(200);

    expect(res.body.type).toBe("read");
    expect(res.body.columns).toContain("cnt");
    expect(res.body.rows[0].cnt).toBeGreaterThanOrEqual(2);
  });

  it("executes a write query", async () => {
    const res = await request
      .post("/admin/db")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: `UPDATE users SET storage_limit = 10737418240 WHERE username = 'admintest'` })
      .expect(200);

    expect(res.body.type).toBe("write");
    expect(res.body.changes).toBeGreaterThanOrEqual(0);
  });

  it("blocks DROP TABLE", async () => {
    const res = await request
      .post("/admin/db")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "DROP TABLE users" })
      .expect(403);
    expect(res.body.error).toContain("not allowed");
  });

  it("returns error for invalid SQL", async () => {
    const res = await request
      .post("/admin/db")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "SELEC * FROM nope" })
      .expect(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects empty SQL", async () => {
    await request
      .post("/admin/db")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "" })
      .expect(400);
  });
});

describe("GET /admin/db/tables", () => {
  it("returns table list with schemas", async () => {
    const res = await request
      .get("/admin/db/tables")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const tableNames = res.body.map((t: any) => t.name);
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("files");
  });
});
