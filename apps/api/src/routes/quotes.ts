import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@thr/db";
import { requireAuth, getUser } from "../auth.js";
import { ApiError } from "../errors.js";
import { priceState } from "../services/search.js";
import { buildQuotePdf, convertBooking, createQuote, emailChannel, whatsappChannel } from "../services/quote.js";
import type { PackageState, PricedPackage } from "@thr/shared";

const createSchema = z.object({ packageId: z.string() });
const shareSchema = z.object({
  channel: z.enum(["email", "whatsapp", "link"]),
  to: z.string().optional(),
});
const convertSchema = z.object({ paymentRef: z.string().optional() });

export async function quoteRoutes(app: FastifyInstance) {
  app.post("/quotes", { preHandler: requireAuth }, async (req) => {
    const body = createSchema.parse(req.body);
    const user = getUser(req);
    const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
    if (!pkg) throw new ApiError(404, "Package not found", "NOT_FOUND");
    const priced = await priceState(pkg.stateJson as unknown as PackageState, user.commissionBps);
    const key = req.headers["idempotency-key"];
    const quote = await createQuote(priced, user.id, pkg.id, typeof key === "string" ? key : undefined);
    return quote;
  });

  app.get("/quotes/:id", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const quote = await prisma.quote.findUnique({ where: { id }, include: { bookings: true } });
    if (!quote) throw new ApiError(404, "Quote not found", "NOT_FOUND");
    return quote;
  });

  app.post("/quotes/:id/share", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const body = shareSchema.parse(req.body);
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new ApiError(404, "Quote not found", "NOT_FOUND");
    const snapshot = quote.snapshotJson as unknown as PricedPackage;
    const text = `THR Holidays quote ${quote.id} total ${(snapshot.price.totalMinor / 100).toFixed(2)} INR. Lock until ${quote.rateLockExpiresAt.toISOString()}`;
    let result = { ok: true, provider: "link" };
    if (body.channel === "email") result = await emailChannel.send(body.to ?? "", text);
    if (body.channel === "whatsapp") result = await whatsappChannel.send(body.to ?? "", text);
    const history = Array.isArray(quote.shareHistoryJson) ? quote.shareHistoryJson : [];
    await prisma.quote.update({
      where: { id },
      data: {
        status: quote.status === "DRAFT" ? "SHARED" : quote.status,
        shareHistoryJson: [...history, { channel: body.channel, to: body.to, at: new Date().toISOString(), result }],
      },
    });
    return { ...result, publicUrl: `/q/${quote.publicToken}` };
  });

  app.get("/quotes/:id/pdf", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { bytes } = await buildQuotePdf(id);
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="quote-${id}.pdf"`);
    return reply.send(Buffer.from(bytes));
  });

  app.post("/quotes/:id/convert", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const body = convertSchema.parse(req.body ?? {});
    const key = req.headers["idempotency-key"];
    return convertBooking(id, body.paymentRef, typeof key === "string" ? key : undefined);
  });
}
