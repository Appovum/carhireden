// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Money & Minor Units Utility
// All monetary amounts are strictly integers in minor units (e.g. cents).
// ═══════════════════════════════════════════════════════════════════

export type CurrencyCode = string;

export interface Money {
  amountMinor: number; // Integer minor units (e.g. 1050 = $10.50)
  currency?: CurrencyCode;
  exchangeRate?: number;
}

/**
 * Validates that an amount is a safe integer (minor units).
 */
export function isIntegerMinor(amount: number): boolean {
  return Number.isInteger(amount) && Number.isSafeInteger(amount);
}

/**
 * Create a Money object ensuring integer minor units.
 */
export function createMoney(amountMinor: number, currency: CurrencyCode = "USD", exchangeRate: number = 1): Money {
  if (!isIntegerMinor(amountMinor)) {
    throw new TypeError(`Money amountMinor must be an integer, got: ${amountMinor}`);
  }
  return {
    amountMinor,
    currency: currency.toUpperCase(),
    exchangeRate,
  };
}

/**
 * Safely convert major unit amount (float or string, e.g. 10.50 or "10.50") to minor units (e.g. 1050).
 */
export function toMinorUnits(amount: number | string, currency: CurrencyCode = "USD", decimals: number = 2): Money {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    throw new TypeError(`Invalid money amount: ${amount}`);
  }
  const factor = Math.pow(10, decimals);
  const minor = Math.round(num * factor);
  return createMoney(minor, currency);
}

/**
 * Convert minor unit Money object back to major unit float (for display/export), applying exchange rate multiplier if provided.
 */
export function fromMinorUnits(money: Money, decimals: number = 2, exchangeRate?: number): number {
  const factor = Math.pow(10, decimals);
  const baseMajor = money.amountMinor / factor;
  const rate = money.exchangeRate ?? exchangeRate ?? 1;
  return baseMajor * rate;
}

/**
 * Format a Money object to localized currency string (e.g. "$10.50" or "€9.20"), applying exchange rate multiplier if provided.
 */
export function formatMoney(
  money: Money,
  locale: string = "en-US",
  decimals: number = 2,
  exchangeRate?: number
): string {
  const rate = money.exchangeRate ?? exchangeRate ?? 1;
  const major = fromMinorUnits(money, decimals, rate);
  const curr = money.currency || "USD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: curr,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/**
 * Get currency symbol (e.g. € for EUR, $ for USD, £ for GBP, ₹ for INR).
 */
export function getCurrencySymbol(currency: string = "USD", locale: string = "en-US"): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart ? symbolPart.value : "$";
  } catch {
    return "$";
  }
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amountMinor + b.amountMinor, a.currency || "USD", a.exchangeRate);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amountMinor - b.amountMinor, a.currency || "USD", a.exchangeRate);
}

export function calculateShare(gross: any, userPercentage: number): any {
  if (typeof gross === "number") {
    return Math.round((gross * userPercentage) / 100);
  }
  const shareMinor = Math.round(((gross.amountMinor || 0) * userPercentage) / 100);
  return createMoney(shareMinor, gross.currency || "USD", gross.exchangeRate);
}
