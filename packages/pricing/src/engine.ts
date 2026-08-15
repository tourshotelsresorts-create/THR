import type { LineItem, MoneyMinor, PriceBreakup, TaxStackStep } from "@thr/shared";
import { TAX_STACK_STEPS } from "@thr/shared";
import { add, mulBps, mulE6, sub } from "./money.js";
import { selectMarkupRules, type MarkupRuleInput } from "./markup.js";

export interface CostInputs {
  hotelMinor: MoneyMinor;
  vehicleMinor: MoneyMinor;
  activityMinor: MoneyMinor;
  visaMinor: MoneyMinor;
  insuranceMinor: MoneyMinor;
  guideMinor: MoneyMinor;
  serviceChargeMinor: MoneyMinor;
}

export interface TaxRuleInput {
  type: "GST" | "TCS";
  rateBps: number;
  enabled: boolean;
  nationalityIn: string[];
  minTaxableMinor: number;
}

export interface PricingInput {
  costs: CostInputs;
  markupRules: MarkupRuleInput[];
  taxRules: TaxRuleInput[];
  commissionBps: number;
  nationality: string;
  destinationId: string;
  hotelCategory?: string;
  agentGroupId?: string;
  customerSegmentId?: string;
  supplierIds: string[];
  asOf: Date;
  canonicalCurrency: string;
  displayCurrency: string;
  fxRateE6: number;
  stackingOrder: TaxStackStep[];
}

const DEFAULT_ORDER: TaxStackStep[] = ["NET", "MARKUP", "GST", "TCS", "COMMISSION"];

/**
 * Cost stacking (configurable via stackingOrder; default documented in ASSUMPTIONS.md):
 * NET (sum of cost heads) → MARKUP (stacked matching rules) → GST → TCS → COMMISSION (subtracted).
 * GST-before-or-after-markup is an open Finance question; default is markup then GST.
 */
export function pricePackage(input: PricingInput): PriceBreakup {
  const order = normalizeOrder(input.stackingOrder);
  const lines: LineItem[] = [
    { head: "HOTEL", label: "Hotel", amountMinor: input.costs.hotelMinor },
    { head: "VEHICLE", label: "Ground transport", amountMinor: input.costs.vehicleMinor },
    { head: "ACTIVITY", label: "Activities", amountMinor: input.costs.activityMinor },
    { head: "VISA", label: "Visa (cost only)", amountMinor: input.costs.visaMinor },
    { head: "INSURANCE", label: "Insurance (cost only)", amountMinor: input.costs.insuranceMinor },
    { head: "GUIDE", label: "Guide", amountMinor: input.costs.guideMinor },
    { head: "SERVICE_CHARGE", label: "Service charges", amountMinor: input.costs.serviceChargeMinor },
  ];

  const netMinor = lines.reduce((s, l) => add(s, l.amountMinor), 0);

  const appliedRules = selectMarkupRules(input.markupRules, {
    destinationId: input.destinationId,
    hotelCategory: input.hotelCategory,
    packageNetMinor: netMinor,
    agentGroupId: input.agentGroupId,
    customerSegmentId: input.customerSegmentId,
    supplierIds: input.supplierIds,
    productTypes: ["PACKAGE", "HOTEL", "VEHICLE", "ACTIVITY"],
    asOf: input.asOf,
  });

  let markupMinor = 0;
  let running = netMinor;
  for (const rule of appliedRules) {
    const chunk = rule.type === "PERCENTAGE" ? mulBps(running, rule.value) : rule.value;
    markupMinor = add(markupMinor, chunk);
    running = add(running, chunk);
    lines.push({
      head: "MARKUP",
      label: `Markup: ${rule.name}`,
      amountMinor: chunk,
      meta: { ruleId: rule.id, scope: rule.scope },
    });
  }

  const gstRule = input.taxRules.find((t) => t.type === "GST" && t.enabled);
  const tcsRule = input.taxRules.find(
    (t) =>
      t.type === "TCS" &&
      t.enabled &&
      (t.nationalityIn.length === 0 || t.nationalityIn.includes(input.nationality)),
  );

  const gstBase = order.indexOf("GST") > order.indexOf("MARKUP") ? add(netMinor, markupMinor) : netMinor;
  const gstMinor =
    gstRule && gstBase >= gstRule.minTaxableMinor ? mulBps(gstBase, gstRule.rateBps) : 0;
  if (gstMinor) {
    lines.push({ head: "GST", label: `GST ${(gstRule!.rateBps / 100).toFixed(2)}%`, amountMinor: gstMinor });
  }

  const afterGst = add(gstBase, gstMinor);
  const tcsBase = order.indexOf("TCS") > order.indexOf("GST") ? afterGst : gstBase;
  const tcsMinor =
    tcsRule && tcsBase >= tcsRule.minTaxableMinor ? mulBps(tcsBase, tcsRule.rateBps) : 0;
  if (tcsMinor) {
    lines.push({ head: "TCS", label: `TCS ${(tcsRule!.rateBps / 100).toFixed(2)}%`, amountMinor: tcsMinor });
  }

  const preCommission = add(add(netMinor, markupMinor), add(gstMinor, tcsMinor));
  const commissionMinor = mulBps(preCommission, input.commissionBps);
  if (commissionMinor) {
    lines.push({
      head: "COMMISSION",
      label: `Agent commission ${(input.commissionBps / 100).toFixed(2)}%`,
      amountMinor: -commissionMinor,
    });
  }

  const totalMinor = sub(preCommission, commissionMinor);
  lines.push({ head: "TOTAL", label: "Selling price", amountMinor: totalMinor });

  return {
    currency: input.canonicalCurrency,
    displayCurrency: input.displayCurrency,
    fxRate: (input.fxRateE6 / 1_000_000).toFixed(6),
    netMinor,
    markupMinor,
    gstMinor,
    tcsMinor,
    commissionMinor,
    totalMinor,
    displayTotalMinor: mulE6(totalMinor, input.fxRateE6),
    lines,
    appliedMarkupRuleIds: appliedRules.map((r) => r.id),
    stackingOrder: order,
  };
}

function normalizeOrder(order: TaxStackStep[]): TaxStackStep[] {
  const filtered = order.filter((s) => (TAX_STACK_STEPS as readonly string[]).includes(s));
  return filtered.length === TAX_STACK_STEPS.length ? filtered : DEFAULT_ORDER;
}
