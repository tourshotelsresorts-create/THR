import { prisma } from "@thr/db";

const defaults: Record<string, string> = {
  RATE_LOCK_HOURS: "24",
  TAX_STACKING_ORDER: "NET,MARKUP,GST,TCS,COMMISSION",
  MARKUP_APPROVER_ROLE: "REVENUE_ADMIN",
  WHATSAPP_PROVIDER: "stub",
  TRANSFER_VENDOR: "mock-holidaytaxis",
  ACTIVITY_VENDOR: "mock-viator",
  HOTEL_VENDOR: "mock-hotelbeds",
  CANONICAL_CURRENCY: "INR",
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? process.env[key] ?? defaults[key] ?? "";
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.systemSetting.findMany();
  const out = { ...defaults };
  for (const r of rows) out[r.key] = r.value;
  return out;
}
