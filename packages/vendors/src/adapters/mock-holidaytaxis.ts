import type { AvailabilityQuery, VendorAdapter, VendorRate, VoucherResult } from "../types.js";
import { holidayTaxisFixture } from "../fixtures/holidaytaxis.js";

export class MockHolidayTaxisAdapter implements VendorAdapter {
  readonly name = "mock-holidaytaxis";
  readonly kind = "transfer" as const;

  async searchAvailability(q: AvailabilityQuery): Promise<VendorRate[]> {
    return holidayTaxisFixture
      .filter((a) => a.city.toLowerCase() === q.destinationCity.toLowerCase())
      .map((a) => ({
        vendor: this.name,
        vendorCode: a.code,
        currency: "INR",
        amountMinor: a.netMinor,
        refundable: false,
        raw: a.payload,
      }));
  }

  async getRate(vendorCode: string, _q: AvailabilityQuery): Promise<VendorRate | null> {
    const hit = holidayTaxisFixture.find((a) => a.code === vendorCode);
    if (!hit) return null;
    return {
      vendor: this.name,
      vendorCode: hit.code,
      currency: "INR",
      amountMinor: hit.netMinor,
      refundable: false,
      raw: hit.payload,
    };
  }

  async bookVoucher(vendorCode: string): Promise<VoucherResult> {
    return { confirmationRef: `HTX-MOCK-${vendorCode}`, status: "CONFIRMED", raw: {} };
  }
}
