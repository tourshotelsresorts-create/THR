import type { AvailabilityQuery, VendorAdapter, VendorRate, VoucherResult } from "../types.js";
import { hotelbedsFixture } from "../fixtures/hotelbeds.js";

export class MockHotelbedsAdapter implements VendorAdapter {
  readonly name = "mock-hotelbeds";
  readonly kind = "hotel" as const;

  async searchAvailability(q: AvailabilityQuery): Promise<VendorRate[]> {
    return hotelbedsFixture
      .filter((h) => h.city.toLowerCase() === q.destinationCity.toLowerCase())
      .map((h) => toRate(h));
  }

  async getRate(vendorCode: string, _q: AvailabilityQuery): Promise<VendorRate | null> {
    const hit = hotelbedsFixture.find((h) => h.code === vendorCode);
    return hit ? toRate(hit) : null;
  }

  async bookVoucher(vendorCode: string, _q: AvailabilityQuery): Promise<VoucherResult> {
    return {
      confirmationRef: `HB-MOCK-${vendorCode}-${Date.now()}`,
      status: "CONFIRMED",
      raw: { provider: "hotelbeds-mock" },
    };
  }
}

function toRate(h: (typeof hotelbedsFixture)[number]): VendorRate {
  return {
    vendor: "mock-hotelbeds",
    vendorCode: h.code,
    currency: "INR",
    amountMinor: h.netMinor,
    refundable: h.refundable,
    raw: h.payload,
  };
}
