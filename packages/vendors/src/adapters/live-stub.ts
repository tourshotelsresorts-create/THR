import type { AvailabilityQuery, VendorAdapter, VendorRate, VoucherResult } from "../types.js";

/**
 * Live vendor stub. Swap credentials + base URL via env; do not rewrite call sites.
 * TODO: Hotelbeds API-Key / X-Signature auth
 * TODO: map Hotelbeds availability RS to VendorRate
 * TODO: RateHawk / Viator / HolidayTaxis live endpoints once vendor selection is closed
 */
export class LiveVendorStub implements VendorAdapter {
  readonly name: string;
  readonly kind;

  constructor(
    name: string,
    kind: VendorAdapter["kind"],
    private readonly envKeys: { apiKey: string; apiSecret: string; baseUrl: string },
  ) {
    this.name = name;
    this.kind = kind;
  }

  async searchAvailability(_q: AvailabilityQuery): Promise<VendorRate[]> {
    if (!process.env[this.envKeys.apiKey]) {
      return [];
    }
    // TODO: HTTP call to this.envKeys.baseUrl
    throw new Error(`${this.name} live adapter is not configured (missing ${this.envKeys.apiKey})`);
  }

  async getRate(): Promise<VendorRate | null> {
    return null;
  }

  async bookVoucher(): Promise<VoucherResult> {
    return { confirmationRef: "", status: "FAILED", raw: { reason: "live adapter stub" } };
  }
}
