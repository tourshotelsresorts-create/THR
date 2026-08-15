import type { RateSource } from "@prisma/client";
import { pickLiveRate, type VendorRate } from "@thr/vendors";

export interface StoredRate {
  source: RateSource;
  priceMinor: number;
  validFrom: Date;
  validTo: Date;
  seasonalMultiplier?: number;
  seasonalFrom?: Date;
  seasonalTo?: Date;
}

/**
 * API rates override static rates when both are valid for the night.
 * Seasonal multipliers apply to STATIC only (API is already live-priced).
 */
export function resolveNightRate(
  rates: StoredRate[],
  night: Date,
  apiRate: VendorRate | null,
): { source: "API" | "STATIC"; amountMinor: number } | null {
  const inWindow = rates.filter((r) => night >= r.validFrom && night <= r.validTo);
  const staticRate = inWindow.find((r) => r.source === "STATIC");
  const storedApi = inWindow.find((r) => r.source === "API");
  const live =
    apiRate ??
    (storedApi
      ? {
          vendor: "stored-api",
          vendorCode: "",
          currency: "INR",
          amountMinor: storedApi.priceMinor,
          refundable: true,
          raw: {},
        }
      : null);
  let staticMinor: number | null = staticRate == null ? null : staticRate.priceMinor;
  if (staticRate && staticRate.seasonalMultiplier && staticRate.seasonalFrom && staticRate.seasonalTo) {
    if (night >= staticRate.seasonalFrom && night <= staticRate.seasonalTo) {
      staticMinor = Math.round(staticRate.priceMinor * staticRate.seasonalMultiplier);
    }
  }
  return pickLiveRate(staticMinor, live);
}

export function nightsBetween(checkIn: Date, nights: number): Date[] {
  return Array.from({ length: nights }, (_, i) => {
    const d = new Date(checkIn);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date ${s}`);
  return d;
}
