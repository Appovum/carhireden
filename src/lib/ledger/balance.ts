// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Wallet Balance Aggregator & Cache
// Derives user balances dynamically by summing append-only ledger entries.
// Never mutates balance columns.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface WalletBalanceSummary {
  userId: string;
  pendingMinor: number;
  confirmedMinor: number;
  paidMinor: number;
  totalMinor: number;
  currency: string;
}

const balanceCache = new Map<string, { summary: WalletBalanceSummary; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export function invalidateUserBalanceCache(userId: string): void {
  balanceCache.delete(userId);
}

export async function getUserWalletBalance(userId: string): Promise<WalletBalanceSummary> {
  const cached = balanceCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.summary;
  }

  // Aggregate sums by bucket directly from append-only wallet_entries table
  const pendingAgg = await db.walletEntry.aggregate({
    where: { userId, bucket: "pending" },
    _sum: { amountMinor: true },
  });

  const confirmedAgg = await db.walletEntry.aggregate({
    where: { userId, bucket: "confirmed" },
    _sum: { amountMinor: true },
  });

  const paidAgg = await db.walletEntry.aggregate({
    where: { userId, bucket: "paid" },
    _sum: { amountMinor: true },
  });

  const pendingMinor = pendingAgg._sum.amountMinor || 0;
  const confirmedMinor = confirmedAgg._sum.amountMinor || 0;
  const paidMinor = paidAgg._sum.amountMinor || 0;
  const totalMinor = pendingMinor + confirmedMinor + paidMinor;

  const summary: WalletBalanceSummary = {
    userId,
    pendingMinor,
    confirmedMinor,
    paidMinor,
    totalMinor,
    currency: "USD",
  };

  balanceCache.set(userId, { summary, timestamp: Date.now() });

  return summary;
}
