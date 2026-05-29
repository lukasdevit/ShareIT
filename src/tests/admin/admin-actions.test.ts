import { describe, it, expect } from "vitest";
import { request, adminToken, userToken } from "../setup/setup.js";

describe("GET /admin/actions", () => {
  it("returns actions list (may be empty initially)", async () => {
    const res = await request
      .get("/admin/actions")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty("actions");
    expect(Array.isArray(res.body.actions)).toBe(true);
  });

  it("rejects non-admin users", async () => {
    await request
      .get("/admin/actions")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });
});

describe("POST /admin/actions/:id/undo", () => {
  it("returns 404 for non-existent action", async () => {
    await request
      .post("/admin/actions/99999/undo")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});

describe("DELETE /admin/actions", () => {
  it("clears undone actions", async () => {
    const res = await request
      .delete("/admin/actions")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
  });
});
