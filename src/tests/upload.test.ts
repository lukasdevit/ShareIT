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

describe("POST /upload", () => {
  it("rejects unauthenticated uploads", async () => {
    const res = await request
      .post("/upload")
      .expect(401);

    expect(res.body.error).toContain("Missing token");
  });
});

describe("POST /sharex/upload", () => {
  it("rejects request without a file (NOT an auth error)", async () => {
    // ShareX endpoint is public — no auth required by design.
    // Sending no file triggers a non-200 status, but importantly NOT 401.
    const res = await request
      .post("/sharex/upload");

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(401); // Auth is NOT the blocker
  });
});

describe("GET /sharex/config", () => {
  it("returns a ShareX config file", async () => {
    const res = await request
      .get("/sharex/config")
      .expect(200);

    expect(res.body).toHaveProperty("Name");
    expect(res.body).toHaveProperty("DestinationType");
    expect(res.body.RequestURL).toContain("/sharex/upload");
  });
});
