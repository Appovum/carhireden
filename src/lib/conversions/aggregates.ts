// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Owner Aggregates & Performance Analytics
// Calculates clicks, conversions, commission, and EPC grouped by
// store, coupon, category, and day.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface AggregateMetrics {
  clicks: number;
  conversions: number;
  commissionMinor: number;
  cashbackMinor: number;
  epcMinor: number; // Earnings per click in minor units
  currency: string;
}

export function calculateEpc(commissionMinor: number, totalClicks: number): number {
  if (totalClicks <= 0) return 0;
  return Math.round(commissionMinor / totalClicks);
}

export async function getStoreAggregates(storeId: string): Promise<AggregateMetrics> {
  const clicks = await db.click.count({
    where: { storeId },
  });

  const conversionAgg = await db.conversion.aggregate({
    where: { storeId },
    _count: { id: true },
    _sum: { commissionMinor: true, cashbackMinor: true },
  });

  const commissionMinor = conversionAgg._sum.commissionMinor || 0;
  const cashbackMinor = conversionAgg._sum.cashbackMinor || 0;
  const conversions = conversionAgg._count.id;
  const epcMinor = calculateEpc(commissionMinor, clicks);

  return {
    clicks,
    conversions,
    commissionMinor,
    cashbackMinor,
    epcMinor,
    currency: "USD",
  };
}

export async function getCouponAggregates(couponId: string): Promise<AggregateMetrics> {
  const clicks = await db.click.count({
    where: { couponId },
  });

  const conversionAgg = await db.conversion.aggregate({
    where: { click: { couponId } },
    _count: { id: true },
    _sum: { commissionMinor: true, cashbackMinor: true },
  });

  const commissionMinor = conversionAgg._sum.commissionMinor || 0;
  const cashbackMinor = conversionAgg._sum.cashbackMinor || 0;
  const conversions = conversionAgg._count.id;
  const epcMinor = calculateEpc(commissionMinor, clicks);

  return {
    clicks,
    conversions,
    commissionMinor,
    cashbackMinor,
    epcMinor,
    currency: "USD",
  };
}

export async function getCategoryAggregates(categoryId: string): Promise<AggregateMetrics> {
  const stores = await db.storeCategory.findMany({
    where: { categoryId },
    select: { storeId: true },
  });
  const storeIds = stores.map((s) => s.storeId);

  const clicks = await db.click.count({
    where: { storeId: { in: storeIds } },
  });

  const conversionAgg = await db.conversion.aggregate({
    where: { storeId: { in: storeIds } },
    _count: { id: true },
    _sum: { commissionMinor: true, cashbackMinor: true },
  });

  const commissionMinor = conversionAgg._sum.commissionMinor || 0;
  const cashbackMinor = conversionAgg._sum.cashbackMinor || 0;
  const conversions = conversionAgg._count.id;
  const epcMinor = calculateEpc(commissionMinor, clicks);

  return {
    clicks,
    conversions,
    commissionMinor,
    cashbackMinor,
    epcMinor,
    currency: "USD",
  };
}

export async function getDailyAggregates(date: Date): Promise<AggregateMetrics> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const clicks = await db.click.count({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  const conversionAgg = await db.conversion.aggregate({
    where: {
      transactionDate: { gte: startOfDay, lte: endOfDay },
    },
    _count: { id: true },
    _sum: { commissionMinor: true, cashbackMinor: true },
  });

  const commissionMinor = conversionAgg._sum.commissionMinor || 0;
  const cashbackMinor = conversionAgg._sum.cashbackMinor || 0;
  const conversions = conversionAgg._count.id;
  const epcMinor = calculateEpc(commissionMinor, clicks);

  return {
    clicks,
    conversions,
    commissionMinor,
    cashbackMinor,
    epcMinor,
    currency: "USD",
  };
}
