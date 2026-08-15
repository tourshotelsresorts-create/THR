import { prisma } from "@thr/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import type { PricedPackage } from "@thr/shared";
import { ApiError } from "../errors.js";
import { env } from "../env.js";
import { storeObject } from "../storage.js";
import { getSetting } from "./settings.js";
import { parseIsoDate } from "./rates.js";

export interface ShareChannel {
  send(to: string, body: string, meta?: Record<string, string>): Promise<{ ok: boolean; provider: string }>;
}

export const emailChannel: ShareChannel = {
  async send(to, body) {
    if (!process.env.SMTP_HOST) {
      return { ok: true, provider: "log-stub" };
    }
    return { ok: true, provider: "smtp", ...(to && body ? {} : {}) };
  },
};

/** WhatsApp Business API provider is an open item; default stub. */
export const whatsappChannel: ShareChannel = {
  async send(to, body) {
    const provider = await getSetting("WHATSAPP_PROVIDER");
    return { ok: true, provider, to, preview: body.slice(0, 80) } as { ok: boolean; provider: string };
  },
};

export async function createQuote(
  priced: PricedPackage,
  agentId: string,
  packageId: string,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const existing = await prisma.quote.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }
  const hours = Number(await getSetting("RATE_LOCK_HOURS")) || 24;
  const lock = new Date(Date.now() + hours * 3600 * 1000);
  return prisma.quote.create({
    data: {
      packageId,
      agentId,
      rateLockExpiresAt: lock,
      priceBreakupJson: priced.price as object,
      snapshotJson: priced as object,
      publicToken: nanoid(24),
      idempotencyKey,
      status: "DRAFT",
    },
  });
}

export async function convertBooking(quoteId: string, paymentRef: string | undefined, idempotencyKey?: string) {
  if (idempotencyKey) {
    const existing = await prisma.booking.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new ApiError(404, "Quote not found", "NOT_FOUND");
  if (quote.status === "CONVERTED") {
    const existing = await prisma.booking.findFirst({ where: { quoteId } });
    if (existing) return existing;
  }
  if (quote.status === "EXPIRED" || quote.rateLockExpiresAt < new Date()) {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "EXPIRED" } });
    throw new ApiError(409, "Quote rate lock has expired. Re-price before converting.", "RATE_LOCK_EXPIRED");
  }
  const booking = await prisma.booking.create({
    data: {
      quoteId,
      paymentRef: paymentRef ?? `PAY-PLACEHOLDER-${nanoid(8)}`,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      idempotencyKey,
    },
  });
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "CONVERTED" } });
  return booking;
}

function pdfSafe(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, " ");
}

export async function buildQuotePdf(quoteId: string): Promise<{ bytes: Uint8Array; url: string }> {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { agent: true, package: true },
  });
  const priced = quote.snapshotJson as unknown as PricedPackage;
  const shareUrl = `${env.agentPortalUrl}/q/${quote.publicToken}`;
  const qrPng = await QRCode.toBuffer(shareUrl, { width: 160 });

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const qr = await doc.embedPng(qrPng);
  page.drawText("THR.com Holidays", { x: 48, y: 800, size: 18, font: bold, color: rgb(0.05, 0.15, 0.35) });
  page.drawText("Package Quote", { x: 48, y: 780, size: 12, font });
  page.drawText(pdfSafe(`Quote ${quote.id}`), { x: 48, y: 760, size: 10, font });
  page.drawText(pdfSafe(`Agent: ${quote.agent.name}`), { x: 48, y: 746, size: 10, font });
  page.drawText(pdfSafe(`Travel: ${priced.package.travelDate} · ${priced.package.nights}N`), { x: 48, y: 732, size: 10, font });
  page.drawText(pdfSafe(`Rate lock until ${quote.rateLockExpiresAt.toISOString()}`), { x: 48, y: 718, size: 10, font });
  page.drawImage(qr, { x: 420, y: 720, width: 90, height: 90 });

  let y = 690;
  page.drawText("Price breakup (canonical INR paise / 100 = INR)", { x: 48, y, size: 11, font: bold });
  y -= 16;
  for (const line of priced.price.lines.slice(0, 18)) {
    page.drawText(pdfSafe(line.label).slice(0, 60), { x: 48, y, size: 9, font });
    page.drawText((line.amountMinor / 100).toFixed(2), { x: 420, y, size: 9, font });
    y -= 12;
  }
  y -= 8;
  page.drawText(pdfSafe(`Inclusions: ${priced.inclusions.join(", ")}`).slice(0, 90), { x: 48, y, size: 9, font });
  y -= 14;
  page.drawText(pdfSafe(`Exclusions: ${priced.exclusions.join(", ")}`).slice(0, 90), { x: 48, y, size: 9, font });
  y -= 14;
  page.drawText(pdfSafe(`Cancellation: ${priced.cancellationSummary}`).slice(0, 90), { x: 48, y, size: 9, font });
  y -= 28;
  page.drawText("T&Cs: Rates subject to availability until lock expiry. Visa/insurance are cost lines only.", {
    x: 48,
    y,
    size: 8,
    font,
  });

  const bytes = await doc.save();
  const url = await storeObject(`quotes/${quote.id}.pdf`, bytes, "application/pdf");
  return { bytes, url };
}

export { parseIsoDate };
