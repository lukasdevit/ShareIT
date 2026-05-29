import { describe, it, expect } from "vitest";
import { request, adminToken, userToken } from "../setup/setup.js";

describe("GET /admin/logs", () => {
  it("returns log entries", async () => {
    const res = await request
      .get("/admin/logs?lines=10&level=30")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty("logs");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it("rejects non-admin", async () => {
    await request
      .get("/admin/logs")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });
});

describe("GET /admin/logs/download", () => {
  it("returns log file content", async () => {
    const res = await request
      .get("/admin/logs/download")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers["content-type"]).toMatch(/text\/plain/);
  });
});

describe("DELETE /admin/logs", () => {
  it("clears logs", async () => {
    const res = await request
      .delete("/admin/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
  });
});
