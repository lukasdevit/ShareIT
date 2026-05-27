import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/index.js";
import { adminUserRoutes } from "./admin/users.js";
import { adminDbRoutes } from "./admin/db.js";
import { adminStorageRoutes, adminSslRoutes } from "./admin/storage.js";
import { adminAnalyticsRoutes } from "./admin/analytics.js";
import { adminBackupRoutes } from "./admin/backup.js";

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require admin authentication.
  // Rate limiting is handled by the global rate-limit plugin (app.ts)
  // and per-route config in individual route files.
  app.addHook("preHandler", requireAdmin);

  await adminUserRoutes(app);
  await adminDbRoutes(app);
  await adminStorageRoutes(app);
  await adminSslRoutes(app);
  await adminAnalyticsRoutes(app);
  await adminBackupRoutes(app);
}
