import { describe, expect, it } from "vitest";
import { resolveNightRate } from "../src/services/rates.js";
import {
  checkHotelFeasibility,
  checkVehicleFeasibility,
  validateSearch,
} from "../src/services/feasibility.js";

describe("rate precedence", () => {
  const window = {
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2026-12-31"),
  };

  it("prefers API over static", () => {
    const r = resolveNightRate(
      [
        { source: "STATIC", priceMinor: 1000, ...window },
        { source: "API", priceMinor: 800, ...window },
      ],
      new Date("2026-08-15"),
      null,
    );
    expect(r).toEqual({ source: "API", amountMinor: 800 });
  });

  it("uses static when API missing", () => {
    const r = resolveNightRate([{ source: "STATIC", priceMinor: 1000, seasonalMultiplier: 1.25, seasonalFrom: new Date("2026-01-01"), seasonalTo: new Date("2026-12-31"), ...window }], new Date("2026-08-15"), null);
    expect(r).toEqual({ source: "STATIC", amountMinor: 1250 });
  });
});

describe("feasibility", () => {
  it("rejects mismatched child ages", () => {
    const f = validateSearch({
      destinationId: "x",
      travelDate: "2026-11-10",
      nights: 3,
      adults: 2,
      children: 1,
      childAges: [],
      rooms: 1,
      nationality: "IN",
      currency: "INR",
    });
    expect(f.some((x) => x.check === "VALIDATION")).toBe(true);
  });

  it("flags blackout dates specifically", () => {
    const f = checkHotelFeasibility(
      {
        id: "h1",
        name: "Alila",
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2027-01-01"),
        blackoutDates: ["2026-12-25"],
        minStayNights: 1,
        roomMaxOccupancy: 3,
        childFreeUntil: 5,
        childRateTo: 11,
      },
      "2026-12-24",
      2,
      2,
      0,
      1,
      [],
    );
    expect(f.some((x) => x.check === "BLACKOUT_DATES" && x.message.includes("2026-12-25"))).toBe(true);
  });

  it("flags min stay", () => {
    const f = checkHotelFeasibility(
      {
        id: "h1",
        name: "Inn",
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2027-01-01"),
        blackoutDates: [],
        minStayNights: 3,
        roomMaxOccupancy: 3,
        childFreeUntil: 5,
        childRateTo: 11,
      },
      "2026-11-10",
      2,
      2,
      0,
      1,
      [],
    );
    expect(f.some((x) => x.check === "MINIMUM_STAY")).toBe(true);
  });

  it("flags vehicle seating", () => {
    const f = checkVehicleFeasibility({ id: "v", seatingCapacity: 3 }, 5);
    expect(f[0]?.check).toBe("TRANSFER_AVAILABILITY");
  });
});
