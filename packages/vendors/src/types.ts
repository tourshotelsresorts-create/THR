export type SupplyKind = "hotel" | "transfer" | "activity";

export interface AvailabilityQuery {
  destinationCity: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms?: number;
}

export interface VendorRate {
  vendor: string;
  vendorCode: string;
  currency: string;
  amountMinor: number;
  refundable: boolean;
  raw: unknown;
}

export interface VoucherResult {
  confirmationRef: string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  raw: unknown;
}

export interface VendorAdapter {
  readonly name: string;
  readonly kind: SupplyKind;
  searchAvailability(q: AvailabilityQuery): Promise<VendorRate[]>;
  getRate(vendorCode: string, q: AvailabilityQuery): Promise<VendorRate | null>;
  bookVoucher(vendorCode: string, q: AvailabilityQuery): Promise<VoucherResult>;
}

export function pickLiveRate(staticMinor: number | null, api: VendorRate | null): {
  source: "API" | "STATIC";
  amountMinor: number;
} | null {
  if (api) return { source: "API", amountMinor: api.amountMinor };
  if (staticMinor != null) return { source: "STATIC", amountMinor: staticMinor };
  return null;
}
