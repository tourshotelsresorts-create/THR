import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@thr/db";
import { requireAuth, getUser } from "../auth.js";
import { persistPackage, searchPackages } from "../services/search.js";
import { validationError } from "../errors.js";

const searchSchema = z.object({
  destinationId: z.string().min(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "travelDate must be YYYY-MM-DD"),
  nights: z.number().int().min(1).max(21),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  childAges: z.array(z.number().int().min(0).max(17)).default([]),
  rooms: z.number().int().min(1),
  nationality: z.string().min(2),
  currency: z.string().min(3),
});

export async function searchRoutes(app: FastifyInstance) {
  app.get("/destinations", async () => {
    return prisma.destination.findMany({ orderBy: { city: "asc" } });
  });

  app.post("/search", { preHandler: requireAuth }, async (req) => {
    const body = searchSchema.parse(req.body);
    if (body.children !== body.childAges.length) {
      throw validationError("childAges length must equal children count.");
    }
    const user = getUser(req);
    const results = await searchPackages(body, user);
    const saved = [];
    for (const r of results) {
      const id = await persistPackage(r, user.id);
      saved.push({ ...r, package: { ...r.package, id } });
    }
    return { results: saved };
  });
}
