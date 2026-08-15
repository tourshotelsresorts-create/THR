export const ROLES = [
  "AGENT",
  "CONTRACTING_ADMIN",
  "REVENUE_ADMIN",
  "SUPPORT",
  "FINANCE_READONLY",
] as const;
export type Role = (typeof ROLES)[number];

export const MEAL_PLANS = ["EP", "CP", "MAP", "AP"] as const;
export type MealPlan = (typeof MEAL_PLANS)[number];

export const RATE_SOURCES = ["STATIC", "API"] as const;
export type RateSource = (typeof RATE_SOURCES)[number];

export const VEHICLE_TYPES = [
  "SEDAN",
  "SUV",
  "PREMIUM_SUV_INNOVA",
  "LUXURY",
  "VAN",
  "MINI_COACH",
  "COACH",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const TRANSFER_TYPES = ["NONE", "SIC", "PRIVATE"] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

export const SLOT_TYPES = ["HOTEL_NIGHT", "ACTIVITY_SLOT", "TRANSFER_SLOT"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export const SUPPLIER_TYPES = ["HOTEL", "VEHICLE", "ACTIVITY", "DMC"] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const MARKUP_SCOPES = [
  "DESTINATION",
  "HOTEL_CATEGORY",
  "PACKAGE_COST_BAND",
  "AGENT_GROUP",
  "CUSTOMER_SEGMENT",
  "SUPPLIER",
  "PRODUCT_TYPE",
] as const;
export type MarkupScope = (typeof MARKUP_SCOPES)[number];

export const MARKUP_TYPES = ["FIXED", "PERCENTAGE"] as const;
export type MarkupType = (typeof MARKUP_TYPES)[number];

export const TAX_TYPES = ["GST", "TCS"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const QUOTE_STATUSES = ["DRAFT", "SHARED", "CONVERTED", "EXPIRED"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PRODUCT_TYPES = ["HOTEL", "VEHICLE", "ACTIVITY", "PACKAGE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FEASIBILITY_CHECKS = [
  "HOTEL_AVAILABILITY",
  "TRANSFER_AVAILABILITY",
  "ACTIVITY_AVAILABILITY",
  "BLACKOUT_DATES",
  "SEASONAL_PRICING",
  "MINIMUM_STAY",
  "CHILD_POLICY",
  "VALIDATION",
] as const;
export type FeasibilityCheck = (typeof FEASIBILITY_CHECKS)[number];

export const COST_HEADS = [
  "HOTEL",
  "VEHICLE",
  "ACTIVITY",
  "VISA",
  "INSURANCE",
  "GUIDE",
  "SERVICE_CHARGE",
] as const;
export type CostHead = (typeof COST_HEADS)[number];

export const TAX_STACK_STEPS = ["NET", "MARKUP", "GST", "TCS", "COMMISSION"] as const;
export type TaxStackStep = (typeof TAX_STACK_STEPS)[number];

/** Scope specificity used for deterministic markup precedence (higher = more specific). */
export const MARKUP_SCOPE_SPECIFICITY: Record<MarkupScope, number> = {
  CUSTOMER_SEGMENT: 10,
  AGENT_GROUP: 20,
  PACKAGE_COST_BAND: 30,
  DESTINATION: 40,
  HOTEL_CATEGORY: 50,
  SUPPLIER: 60,
  PRODUCT_TYPE: 70,
};

export const HOTEL_TAGS = [
  "beachfront",
  "family",
  "honeymoon",
  "luxury",
  "boutique",
  "city-center",
] as const;
