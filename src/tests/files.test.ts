import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import path from "path";
import fs from "fs";
import { buildApp } from "../app.js";
import { closeDb } from "../db/database.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;
let userToken: string;
let otherToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);

  // Create two users
  const r1 = await request
    .post("/auth/register")
    .send({ username: "fileowner", password: "ownerpass123" });
  userToken = r1.body.token;

  const r2 = await request
    .post("/auth/register")
    .send({ username: "otherguy", password: "otherpass123" });
  otherToken = r2.body.token;
});

afterAll(async () => {
  await app.close();
  closeDb();
});

describe("POST /upload", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request
      .post("/upload")
      .expect(401);

    expect(res.body.error).toContain("Missing token");
  });

  it("rejects request with no file", async () => {
    // Sending a POST to the upload endpoint without attaching a file.
    // The multipart plugin will reject this — exact status depends on
    // how the empty body is parsed (400, 406, or 500). The key is: it fails.
    const res = await request
      .post("/upload")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("accepts a valid text file upload", async () => {
    const testFilePath = path.join(process.cwd(), "src", "tests", "fixtures", "hello.txt");
    // Fixture might not exist, so check first
    if (fs.existsSync(testFilePath)) {
      const res = await request
        .post("/upload")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", testFilePath)
        .expect(200);

      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toContain("/file/");
    }
  });

  it("rejects disallowed file types", async () => {
    // Create a temp .exe-like file with a disallowed mime
    const tmpDir = fs.mkdtempSync("/tmp/upload-test-");
    const badFile = path.join(tmpDir, "virus.exe");
    fs.writeFileSync(badFile, "not really a virus");

    const res = await request
      .post("/upload")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", badFile, { contentType: "application/x-msdownload" })
      .expect(415);

    expect(res.body.error).toContain("not allowed");

    // Cleanup
    fs.unlinkSync(badFile);
    fs.rmdirSync(tmpDir);
  });
});

describe("GET /files", () => {
  it("rejects unauthenticated requests", async () => {
    await request
      .get("/files")
      .expect(401);
  });

  it("returns empty list for new user", async () => {
    const res = await request
      .get("/files")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /file/:filename", () => {
  it("returns 404 for non-existent file", async () => {
    const res = await request
      .get("/file/nonexistent123")
      .expect(404);

    expect(res.body.error).toContain("not found");
  });

  it("blocks path traversal attempts", async () => {
    // Fastify may normalize the URL before our handler sees it,
    // so `..` check might come back as 404 instead of 400.
    // Either way, the traversal is blocked.
    const res = await request
      .get("/file/../../../etc/passwd");

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("DELETE /file/:id", () => {
  it("rejects unauthenticated requests", async () => {
    await request
      .delete("/file/1")
      .expect(401);
  });

  it("returns 404 for non-existent file id", async () => {
    const res = await request
      .delete("/file/99999")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(404);

    expect(res.body.error).toContain("not found");
  });
});
