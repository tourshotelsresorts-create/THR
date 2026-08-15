import { buildApp } from "./app.js";
import { env } from "./env.js";
import { initCache } from "./cache.js";
import { logger } from "./logger.js";

const app = await buildApp();
await initCache();
await app.listen({ port: env.port, host: env.host });
logger.info({ port: env.port }, "THR Holidays API listening");
