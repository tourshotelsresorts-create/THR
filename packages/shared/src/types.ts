import type { CostHead, FeasibilityCheck, MealPlan, TransferType, VehicleType } from "./enums.js";

/** Integer minor units of the canonical currency (INR paise by default). Never use floats. */
export type MoneyMinor = number;

export interface Money {
  amountMinor: MoneyMinor;
  currency: string;
}

export interface SearchRequest {
  destinationId: string;
  travelDate: string;
  nights: number;
  adults: number;
  children: number;
  childAges: number[];
  rooms: number;
  nationality: string;
  currency: string;
  agentId?: string;
  customerSegmentId?: string;
}

export interface FeasibilityFailure {
  check: FeasibilityCheck;
  message: string;
  details?: Record<string, unknown>;
}

export interface FeasibilityResult {
  feasible: boolean;
  failures: FeasibilityFailure[];
}

export interface HotelNightSelection {
  nightIndex: number;
  date: string;
  hotelId: string;
  roomTypeId: string;
  mealPlan: MealPlan;
}

export interface ActivitySelection {
  dayNumber: number;
  activityId: string;
  optionId: string;
  transferType: TransferType;
}

export interface PackageState {
  id: string;
  templateId: string;
  destinationId: string;
  travelDate: string;
  nights: number;
  adults: number;
  children: number;
  childAges: number[];
  rooms: number;
  nationality: string;
  displayCurrency: string;
  hotels: HotelNightSelection[];
  vehicleId: string;
  activities: ActivitySelection[];
  visaMinor: MoneyMinor;
  insuranceMinor: MoneyMinor;
  guideMinor: MoneyMinor;
  serviceChargeMinor: MoneyMinor;
  agentId?: string;
  agentGroupId?: string;
  customerSegmentId?: string;
}

export interface LineItem {
  head: CostHead | "MARKUP" | "GST" | "TCS" | "COMMISSION" | "TOTAL";
  label: string;
  amountMinor: MoneyMinor;
  meta?: Record<string, unknown>;
}

export interface PriceBreakup {
  currency: string;
  displayCurrency: string;
  fxRate: string;
  netMinor: MoneyMinor;
  markupMinor: MoneyMinor;
  gstMinor: MoneyMinor;
  tcsMinor: MoneyMinor;
  commissionMinor: MoneyMinor;
  totalMinor: MoneyMinor;
  displayTotalMinor: MoneyMinor;
  lines: LineItem[];
  appliedMarkupRuleIds: string[];
  stackingOrder: string[];
}

export interface PricedPackage {
  package: PackageState;
  templateName: string;
  price: PriceBreakup;
  feasibility: FeasibilityResult;
  inclusions: string[];
  exclusions: string[];
  cancellationSummary: string;
}

export interface VehicleSummary {
  id: string;
  name: string;
  type: VehicleType;
}
