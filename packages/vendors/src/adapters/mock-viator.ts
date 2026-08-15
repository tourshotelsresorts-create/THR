import type { AvailabilityQuery, VendorAdapter, VendorRate, VoucherResult } from "../types.js";
import { viatorFixture } from "../fixtures/viator.js";

export class MockViatorAdapter implements VendorAdapter {
  readonly name = "mock-viator";
  readonly kind = "activity" as const;

  async searchAvailability(q: AvailabilityQuery): Promise<VendorRate[]> {
    return viatorFixture
      .filter((a) => a.city.toLowerCase() === q.destinationCity.toLowerCase())
      .map((a) => ({
        vendor: this.name,
        vendorCode: a.code,
        currency: "INR",
        amountMinor: a.netMinor,
        refundable: true,
        raw: a.payload,
      }));
  }

  async getRate(vendorCode: string, _q: AvailabilityQuery): Promise<VendorRate | null> {
    const hit = viatorFixture.find((a) => a.code === vendorCode);
    if (!hit) return null;
    return {
      vendor: this.name,
      vendorCode: hit.code,
      currency: "INR",
      amountMinor: hit.netMinor,
      refundable: true,
      raw: hit.payload,
    };
  }

  async bookVoucher(vendorCode: string): Promise<VoucherResult> {
    return { confirmationRef: `VIA-MOCK-${vendorCode}`, status: "CONFIRMED", raw: {} };
  }
}
