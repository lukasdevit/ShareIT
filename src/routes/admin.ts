import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/index.js";
import { adminUserRoutes } from "./admin/users.js";
import { adminDbRoutes } from "./admin/db.js";
import { adminStorageRoutes, adminSslRoutes } from "./admin/storage.js";
import { adminAnalyticsRoutes } from "./admin/analytics.js";

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require admin authentication
  app.addHook("preHandler", requireAdmin);

  await adminUserRoutes(app);
  await adminDbRoutes(app);
  await adminStorageRoutes(app);
  await adminSslRoutes(app);
  await adminAnalyticsRoutes(app);
}
