import { buildApp } from "./app.js";
import { PORT } from "./config/index.js";

const app = await buildApp({ logger: true });

await app.listen({ port: PORT });
console.log(`Server listening on port ${PORT}`);