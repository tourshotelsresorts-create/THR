import type { SupplyKind, VendorAdapter } from "./types.js";
import { MockHotelbedsAdapter } from "./adapters/mock-hotelbeds.js";
import { MockViatorAdapter } from "./adapters/mock-viator.js";
import { MockHolidayTaxisAdapter } from "./adapters/mock-holidaytaxis.js";
import { LiveVendorStub } from "./adapters/live-stub.js";

const mocks: Record<SupplyKind, VendorAdapter> = {
  hotel: new MockHotelbedsAdapter(),
  activity: new MockViatorAdapter(),
  transfer: new MockHolidayTaxisAdapter(),
};

export function getAdapter(kind: SupplyKind, name?: string): VendorAdapter {
  if (!name || name.startsWith("mock-")) return mocks[kind];
  if (kind === "hotel") {
    return new LiveVendorStub(name, kind, {
      apiKey: "HOTELBEDS_API_KEY",
      apiSecret: "HOTELBEDS_API_SECRET",
      baseUrl: "HOTELBEDS_BASE_URL",
    });
  }
  if (kind === "activity") {
    return new LiveVendorStub(name, kind, {
      apiKey: "VIATOR_API_KEY",
      apiSecret: "VIATOR_API_SECRET",
      baseUrl: "VIATOR_BASE_URL",
    });
  }
  return new LiveVendorStub(name, kind, {
    apiKey: "HOLIDAYTAXIS_API_KEY",
    apiSecret: "HOLIDAYTAXIS_API_SECRET",
    baseUrl: "HOLIDAYTAXIS_BASE_URL",
  });
}

export * from "./types.js";
export { MockHotelbedsAdapter, MockViatorAdapter, MockHolidayTaxisAdapter, LiveVendorStub };
