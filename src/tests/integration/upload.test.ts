import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../../app.js";
import { closeDb } from "../../db/index.js";
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

describe("POST /upload", () => {
  it("rejects unauthenticated uploads", async () => {
    const res = await request
      .post("/upload")
      .expect(401);

    expect(res.body.error).toContain("Missing token");
  });
});

describe("POST /sharex/upload", () => {
  it("rejects request without auth", async () => {
    const res = await request
      .post("/sharex/upload");

    expect(res.status).toBe(401);
  });
});

describe("GET /sharex/config", () => {
  let token: string;

  beforeAll(async () => {
    const r = await request
      .post("/auth/register")
      .send({ username: "sharexuser", password: "testpass123" });
    token = r.body.token;
  });

  it("returns a ShareX config file for authenticated user", async () => {
    const res = await request
      .get("/sharex/config")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty("Name");
    expect(res.body).toHaveProperty("DestinationType");
    expect(res.body.RequestURL).toContain("/sharex/upload");
  });
});
