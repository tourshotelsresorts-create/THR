import type { MoneyMinor } from "@thr/shared";

/** Integer-only money. All amounts are canonical minor units (INR paise). */
export function add(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return Math.trunc(a) + Math.trunc(b);
}

export function sub(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return Math.trunc(a) - Math.trunc(b);
}

export function mulBps(amount: MoneyMinor, bps: number): MoneyMinor {
  return Math.round((Math.trunc(amount) * Math.trunc(bps)) / 10_000);
}

export function mulE6(amount: MoneyMinor, rateE6: number): MoneyMinor {
  return Math.round((Math.trunc(amount) * Math.trunc(rateE6)) / 1_000_000);
}

export function assertMinor(n: number, label: string): MoneyMinor {
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`${label} must be an integer minor-unit amount, got ${n}`);
  }
  return n;
}
