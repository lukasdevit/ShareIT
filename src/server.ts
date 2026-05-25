import { buildApp } from "./app.js";
import { PORT } from "./config/index.js";
import { seedAdmin, cleanupExpiredFiles } from "./db/index.js";

const app = await buildApp({ logger: true });

await app.listen({ port: PORT, host: "0.0.0.0" });
await seedAdmin();

// Clean up expired files every hour
setInterval(() => { cleanupExpiredFiles().catch(() => {}); }, 60 * 60 * 1000);
// Run once at startup too
cleanupExpiredFiles().catch(() => {});

console.log(`Server listening on port ${PORT}`);