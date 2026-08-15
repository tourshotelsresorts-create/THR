import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth.js";
import { searchRoutes } from "./routes/search.js";
import { packageRoutes } from "./routes/packages.js";
import { quoteRoutes } from "./routes/quotes.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { ApiError } from "./errors.js";
import { logger } from "./logger.js";

export async function buildApp() {
  const app = Fastify({ loggerInstance: logger, genReqId: () => crypto.randomUUID() });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "thr-holidays-api" }));

  await app.register(authRoutes);
  await app.register(searchRoutes);
  await app.register(packageRoutes);
  await app.register(quoteRoutes);
  await app.register(publicRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: err.issues[0]?.message ?? "Invalid request",
        details: err.issues,
      });
    }
    if (err instanceof ApiError) {
      return reply.status(err.statusCode).send({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }
    req.log.error({ err }, "unhandled");
    return reply.status(500).send({ error: "INTERNAL", message: "Unexpected error" });
  });

  return app;
}
