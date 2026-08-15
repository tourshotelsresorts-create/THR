import { describe, expect, it } from "vitest";
import { pricePackage, type MarkupRuleInput, type PricingInput } from "../src/index.js";
import type { TaxStackStep } from "@thr/shared";

const baseRule = (over: Partial<MarkupRuleInput> & Pick<MarkupRuleInput, "id" | "name" | "scope">): MarkupRuleInput => ({
  type: "PERCENTAGE",
  value: 1000,
  priority: 0,
  enabled: true,
  exclusive: false,
  createdAt: new Date("2026-01-01"),
  ...over,
});

function input(over: Partial<PricingInput> = {}): PricingInput {
  return {
    costs: {
      hotelMinor: 1_000_000,
      vehicleMinor: 200_000,
      activityMinor: 150_000,
      visaMinor: 50_000,
      insuranceMinor: 25_000,
      guideMinor: 10_000,
      serviceChargeMinor: 5_000,
    },
    markupRules: [],
    taxRules: [
      { type: "GST", rateBps: 500, enabled: true, nationalityIn: [], minTaxableMinor: 0 },
      { type: "TCS", rateBps: 500, enabled: true, nationalityIn: ["IN"], minTaxableMinor: 0 },
    ],
    commissionBps: 500,
    nationality: "IN",
    destinationId: "dest-goa",
    hotelCategory: "luxury",
    agentGroupId: "ag-retail",
    customerSegmentId: "seg-fit",
    supplierIds: ["sup-1"],
    asOf: new Date("2026-08-15"),
    canonicalCurrency: "INR",
    displayCurrency: "USD",
    fxRateE6: 12_000,
    stackingOrder: ["NET", "MARKUP", "GST", "TCS", "COMMISSION"],
    ...over,
  };
}

describe("pricing engine cost heads", () => {
  it("sums every cost head into net", () => {
    const p = pricePackage(input());
    expect(p.netMinor).toBe(1_440_000);
    expect(p.lines.find((l) => l.head === "HOTEL")?.amountMinor).toBe(1_000_000);
    expect(p.lines.find((l) => l.head === "VISA")?.amountMinor).toBe(50_000);
  });
});

describe("markup stacking / precedence", () => {
  it("applies overlapping rules least-specific first then more specific", () => {
    const rules: MarkupRuleInput[] = [
      baseRule({
        id: "r-dest",
        name: "dest 8%",
        scope: "DESTINATION",
        value: 800,
        destinationId: "dest-goa",
        priority: 10,
      }),
      baseRule({
        id: "r-cat",
        name: "luxury 4%",
        scope: "HOTEL_CATEGORY",
        value: 400,
        hotelCategory: "luxury",
        priority: 20,
      }),
      baseRule({
        id: "r-band",
        name: "band fixed",
        scope: "PACKAGE_COST_BAND",
        type: "FIXED",
        value: 10_000,
        costBandMinMinor: 1_000_000,
        priority: 5,
      }),
    ];
    const p = pricePackage(input({ markupRules: rules }));
    expect(p.appliedMarkupRuleIds).toEqual(["r-band", "r-dest", "r-cat"]);
    // band on net 1440000 -> +10000 = 1450000; dest 8% of 1450000 = 116000; luxury 4% of 1566000 = 62640
    expect(p.markupMinor).toBe(10_000 + 116_000 + 62_640);
  });

  it("stops stacking after an exclusive rule", () => {
    const rules: MarkupRuleInput[] = [
      baseRule({
        id: "r-dest",
        name: "dest exclusive",
        scope: "DESTINATION",
        value: 800,
        destinationId: "dest-goa",
        exclusive: true,
      }),
      baseRule({
        id: "r-cat",
        name: "luxury",
        scope: "HOTEL_CATEGORY",
        value: 400,
        hotelCategory: "luxury",
      }),
    ];
    const p = pricePackage(input({ markupRules: rules }));
    expect(p.appliedMarkupRuleIds).toEqual(["r-dest"]);
  });

  it("ignores disabled and out-of-season rules", () => {
    const rules: MarkupRuleInput[] = [
      baseRule({
        id: "off",
        name: "off",
        scope: "DESTINATION",
        destinationId: "dest-goa",
        enabled: false,
      }),
      baseRule({
        id: "future",
        name: "future",
        scope: "DESTINATION",
        destinationId: "dest-goa",
        validFrom: new Date("2027-01-01"),
      }),
    ];
    const p = pricePackage(input({ markupRules: rules }));
    expect(p.appliedMarkupRuleIds).toEqual([]);
    expect(p.markupMinor).toBe(0);
  });
});

describe("tax stacking order", () => {
  it("default: GST on net+markup, TCS on that result, then commission", () => {
    const p = pricePackage(input());
    const gstBase = p.netMinor + p.markupMinor;
    expect(p.gstMinor).toBe(Math.round((gstBase * 500) / 10_000));
    const tcsBase = gstBase + p.gstMinor;
    expect(p.tcsMinor).toBe(Math.round((tcsBase * 500) / 10_000));
    const pre = gstBase + p.gstMinor + p.tcsMinor;
    expect(p.commissionMinor).toBe(Math.round((pre * 500) / 10_000));
    expect(p.totalMinor).toBe(pre - p.commissionMinor);
  });

  it("GST-before-markup when stacking order puts GST before MARKUP", () => {
    const order: TaxStackStep[] = ["NET", "GST", "MARKUP", "TCS", "COMMISSION"];
    const withMarkup = pricePackage(
      input({
        stackingOrder: order,
        markupRules: [
          baseRule({
            id: "d",
            name: "d",
            scope: "DESTINATION",
            destinationId: "dest-goa",
            value: 1000,
          }),
        ],
      }),
    );
    expect(withMarkup.gstMinor).toBe(Math.round((1_440_000 * 500) / 10_000));
  });

  it("skips TCS when nationality is not in applicability list", () => {
    const p = pricePackage(input({ nationality: "US" }));
    expect(p.tcsMinor).toBe(0);
  });
});

describe("currency conversion", () => {
  it("converts canonical total with integer e6 fx without float drift", () => {
    const p = pricePackage(input({ fxRateE6: 12_000, displayCurrency: "USD" }));
    expect(p.displayTotalMinor).toBe(Math.round((p.totalMinor * 12_000) / 1_000_000));
    expect(p.currency).toBe("INR");
    expect(p.displayCurrency).toBe("USD");
  });
});
