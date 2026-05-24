import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../app.js";
import { closeDb } from "../db/database.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);
});

afterAll(async () => {
  await app.close();
  closeDb();
});

describe("POST /auth/register", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request
      .post("/auth/register")
      .send({ username: "testuser", password: "testpass123" })
      .expect(200);

    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({ username: "testuser" });
    expect(typeof res.body.user.id).toBe("number");
  });

  it("rejects short usernames", async () => {
    const res = await request
      .post("/auth/register")
      .send({ username: "ab", password: "testpass123" })
      .expect(400);

    expect(res.body.error).toContain("min 3 chars");
  });

  it("rejects short passwords", async () => {
    const res = await request
      .post("/auth/register")
      .send({ username: "validuser", password: "12345" })
      .expect(400);

    expect(res.body.error).toContain("min 6 chars");
  });

  it("rejects missing fields", async () => {
    const res = await request
      .post("/auth/register")
      .send({ username: "someone" })
      .expect(400);

    expect(res.body.error).toContain("required");
  });

  it("rejects duplicate usernames", async () => {
    await request
      .post("/auth/register")
      .send({ username: "dupe", password: "testpass123" })
      .expect(200);

    const res = await request
      .post("/auth/register")
      .send({ username: "dupe", password: "testpass123" })
      .expect(409);

    expect(res.body.error).toContain("already taken");
  });
});

describe("POST /auth/login", () => {
  beforeAll(async () => {
    await request
      .post("/auth/register")
      .send({ username: "loginuser", password: "loginpass123" });
  });

  it("logs in with correct credentials", async () => {
    const res = await request
      .post("/auth/login")
      .send({ username: "loginuser", password: "loginpass123" })
      .expect(200);

    expect(res.body).toHaveProperty("token");
    expect(res.body.user.username).toBe("loginuser");
  });

  it("rejects wrong password", async () => {
    const res = await request
      .post("/auth/login")
      .send({ username: "loginuser", password: "wrongpass" })
      .expect(401);

    expect(res.body.error).toContain("Invalid credentials");
  });

  it("rejects non-existent user", async () => {
    const res = await request
      .post("/auth/login")
      .send({ username: "nobody", password: "whatever123" })
      .expect(401);

    expect(res.body.error).toContain("Invalid credentials");
  });

  it("rejects missing fields", async () => {
    const res = await request
      .post("/auth/login")
      .send({})
      .expect(400);

    expect(res.body.error).toContain("required");
  });
});

describe("GET /auth/me", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request
      .post("/auth/register")
      .send({ username: "metester", password: "metest123" });
    token = res.body.token;
  });

  it("returns the current user with a valid token", async () => {
    const res = await request
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.username).toBe("metester");
  });

  it("rejects missing token", async () => {
    const res = await request
      .get("/auth/me")
      .expect(401);

    expect(res.body.error).toContain("Missing token");
  });

  it("rejects invalid token", async () => {
    const res = await request
      .get("/auth/me")
      .set("Authorization", "Bearer garbage-token")
      .expect(401);

    expect(res.body.error).toContain("Invalid");
  });
});
