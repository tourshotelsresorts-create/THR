import { describe, expect, it } from "vitest";
import { pickLiveRate, MockHotelbedsAdapter } from "../src/index.js";

describe("rate precedence", () => {
  it("API rate wins when present", () => {
    expect(
      pickLiveRate(1_000_000, {
        vendor: "mock-hotelbeds",
        vendorCode: "X",
        currency: "INR",
        amountMinor: 900_000,
        refundable: true,
        raw: {},
      }),
    ).toEqual({ source: "API", amountMinor: 900_000 });
  });

  it("falls back to static when API is absent", () => {
    expect(pickLiveRate(1_000_000, null)).toEqual({ source: "STATIC", amountMinor: 1_000_000 });
  });

  it("returns null when neither source exists", () => {
    expect(pickLiveRate(null, null)).toBeNull();
  });
});

describe("mock hotelbeds adapter", () => {
  it("returns Hotelbeds-shaped fixture rates for Goa", async () => {
    const adapter = new MockHotelbedsAdapter();
    const rates = await adapter.searchAvailability({
      destinationCity: "Goa",
      checkIn: "2026-11-10",
      checkOut: "2026-11-13",
      adults: 2,
      children: 0,
    });
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0]?.raw).toHaveProperty("hotels");
  });
});
