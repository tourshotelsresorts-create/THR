import type { FastifyInstance } from "fastify";
import { prisma } from "@thr/db";
import { ApiError } from "../errors.js";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/public/quotes/:token", async (req) => {
    const { token } = req.params as { token: string };
    const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
    if (!quote) throw new ApiError(404, "Quote not found", "NOT_FOUND");
    return {
      id: quote.id,
      status: quote.status,
      rateLockExpiresAt: quote.rateLockExpiresAt,
      snapshot: quote.snapshotJson,
    };
  });
}
