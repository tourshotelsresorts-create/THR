import {
  MARKUP_SCOPE_SPECIFICITY,
  type MarkupScope,
  type MarkupType,
} from "@thr/shared";

export interface MarkupRuleInput {
  id: string;
  name: string;
  scope: MarkupScope;
  type: MarkupType;
  value: number;
  destinationId?: string | null;
  hotelCategory?: string | null;
  costBandMinMinor?: number | null;
  costBandMaxMinor?: number | null;
  agentGroupId?: string | null;
  customerSegmentId?: string | null;
  supplierId?: string | null;
  productType?: string | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  priority: number;
  enabled: boolean;
  exclusive: boolean;
  createdAt: Date;
}

export interface MarkupContext {
  destinationId: string;
  hotelCategory?: string;
  packageNetMinor: number;
  agentGroupId?: string;
  customerSegmentId?: string;
  supplierIds: string[];
  productTypes: string[];
  asOf: Date;
}

/**
 * Deterministic precedence (documented in ASSUMPTIONS.md):
 * 1. Drop disabled / out-of-season / non-matching targeting.
 * 2. Sort remaining: specificity ASC, then priority ASC, then createdAt ASC.
 *    Least-specific applies first so more-specific rules stack on top.
 * 3. Apply sequentially. An exclusive rule stops further stacking after it runs.
 */
export function selectMarkupRules(rules: MarkupRuleInput[], ctx: MarkupContext): MarkupRuleInput[] {
  const matched = rules.filter((r) => ruleMatches(r, ctx));
  matched.sort((a, b) => {
    const spec = MARKUP_SCOPE_SPECIFICITY[a.scope] - MARKUP_SCOPE_SPECIFICITY[b.scope];
    if (spec !== 0) return spec;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const applied: MarkupRuleInput[] = [];
  for (const r of matched) {
    applied.push(r);
    if (r.exclusive) break;
  }
  return applied;
}

function ruleMatches(r: MarkupRuleInput, ctx: MarkupContext): boolean {
  if (!r.enabled) return false;
  if (r.validFrom && ctx.asOf < r.validFrom) return false;
  if (r.validTo && ctx.asOf > r.validTo) return false;
  switch (r.scope) {
    case "DESTINATION":
      return !!r.destinationId && r.destinationId === ctx.destinationId;
    case "HOTEL_CATEGORY":
      return !!r.hotelCategory && r.hotelCategory === ctx.hotelCategory;
    case "PACKAGE_COST_BAND": {
      const min = r.costBandMinMinor ?? 0;
      const max = r.costBandMaxMinor ?? Number.MAX_SAFE_INTEGER;
      return ctx.packageNetMinor >= min && ctx.packageNetMinor <= max;
    }
    case "AGENT_GROUP":
      return !!r.agentGroupId && r.agentGroupId === ctx.agentGroupId;
    case "CUSTOMER_SEGMENT":
      return !!r.customerSegmentId && r.customerSegmentId === ctx.customerSegmentId;
    case "SUPPLIER":
      return !!r.supplierId && ctx.supplierIds.includes(r.supplierId);
    case "PRODUCT_TYPE":
      return !!r.productType && ctx.productTypes.includes(r.productType);
    default:
      return false;
  }
}
