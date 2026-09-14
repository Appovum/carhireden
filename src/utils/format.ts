// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Format utilities
// ═══════════════════════════════════════════════════════════════════

/**
 * Formats a date as relative time: "2h ago", "3d ago", "Just now"
 */
export function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Formats expiry as remaining time with urgency detection.
 * Returns { text, isUrgent } where isUrgent means ≤ 24 hours.
 */
export function formatExpiry(isoDate: string): {
  text: string;
  isUrgent: boolean;
} {
  const now = Date.now();
  const expires = new Date(isoDate).getTime();
  const diffMs = expires - now;

  if (diffMs <= 0) return { text: "Expired", isUrgent: false };

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (hours < 1) {
    const mins = Math.floor(diffMs / 60000);
    return { text: `Expires in ${mins}m`, isUrgent: true };
  }
  if (hours < 24) {
    return { text: `Expires in ${hours}h`, isUrgent: true };
  }
  return { text: `Expires in ${days}d`, isUrgent: false };
}

import { formatMoney } from "@/lib/money";

/**
 * Formats a number with commas: 2847 → "2,847"
 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Formats currency dynamically: 12.48 → "$12.48" or "€11.48" or "₹1,042.08"
 */
export function formatCurrency(amount: number, currency: string = "USD", exchangeRate: number = 1): string {
  return formatMoney({ amountMinor: Math.round(amount * 100), currency, exchangeRate });
}
