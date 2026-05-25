import { buildApp } from "./app.js";
import { PORT } from "./config/index.js";
import { seedAdmin } from "./db/database.js";

const app = await buildApp({ logger: true });

await app.listen({ port: PORT, host: "0.0.0.0" });
await seedAdmin();
console.log(`Server listening on port ${PORT}`);