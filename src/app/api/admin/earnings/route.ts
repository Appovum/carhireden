// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Earnings Analytics API Route
// Route: GET /api/admin/earnings?range=90d
// Queries real database clicks, conversions, stores & coupons.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "90d";

  let days = 90;
  if (range === "today") days = 1;
  if (range === "7d") days = 7;
  if (range === "30d") days = 30;

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  try {
    // 1. Current Period Clicks, Conversions & Featured Placement Ad Revenue
    const [
      currentClicksCount,
      currentConversions,
      currentAdOrders,
      prevClicksCount,
      prevConversions,
      prevAdOrders,
      activeStoresCount,
      activeCouponsCount,
    ] = await Promise.all([
      db.click.count({ where: { createdAt: { gte: startDate } } }),
      db.conversion.findMany({ where: { createdAt: { gte: startDate } } }),
      db.featuredOrder.findMany({ where: { paymentStatus: "paid", createdAt: { gte: startDate } } }),
      db.click.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.conversion.findMany({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.featuredOrder.findMany({ where: { paymentStatus: "paid", createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.store.count(),
      db.coupon.count({ where: { status: "active" } }),
    ]);

    const conversionsCount = currentConversions.length;
    const prevConversionsCount = prevConversions.length;

    const grossCommissionMinor = currentConversions.reduce((sum, c) => sum + c.commissionMinor, 0);
    const adRevenueMinor = currentAdOrders.reduce((sum, o) => sum + o.priceMinor, 0);
    const cashbackPaidMinor = currentConversions.reduce((sum, c) => sum + c.cashbackMinor, 0);
    const netProfitMinor = grossCommissionMinor - cashbackPaidMinor;

    const prevGrossCommissionMinor = prevConversions.reduce((sum, c) => sum + c.commissionMinor, 0);
    const prevAdRevenueMinor = prevAdOrders.reduce((sum, o) => sum + o.priceMinor, 0);
    const prevCashbackPaidMinor = prevConversions.reduce((sum, c) => sum + c.cashbackMinor, 0);
    const prevNetProfitMinor = prevGrossCommissionMinor - prevCashbackPaidMinor;

    const adRevenueDelta = prevAdRevenueMinor > 0 ? ((adRevenueMinor - prevAdRevenueMinor) / prevAdRevenueMinor) * 100 : 0;

    // Conversion Rates
    const currentRate = currentClicksCount > 0 ? (conversionsCount / currentClicksCount) * 100 : 0;
    const prevRate = prevClicksCount > 0 ? (prevConversionsCount / prevClicksCount) * 100 : 0;
    const conversionRateDelta = currentRate - prevRate; // Percentage point change

    // Deltas
    const clicksDelta = prevClicksCount > 0 ? ((currentClicksCount - prevClicksCount) / prevClicksCount) * 100 : 0;
    const conversionsDelta = prevConversionsCount > 0 ? ((conversionsCount - prevConversionsCount) / prevConversionsCount) * 100 : 0;
    const grossCommissionDelta = prevGrossCommissionMinor > 0 ? ((grossCommissionMinor - prevGrossCommissionMinor) / prevGrossCommissionMinor) * 100 : 0;
    const cashbackPaidDelta = prevCashbackPaidMinor > 0 ? ((cashbackPaidMinor - prevCashbackPaidMinor) / prevCashbackPaidMinor) * 100 : 0;
    const netProfitDelta = prevNetProfitMinor > 0 ? ((netProfitMinor - prevNetProfitMinor) / prevNetProfitMinor) * 100 : 0;

    // 2. Top Earning Stores with Real Names
    const storeAggregates = await db.conversion.groupBy({
      by: ["storeId"],
      where: { createdAt: { gte: startDate } },
      _sum: {
        commissionMinor: true,
        cashbackMinor: true,
        amountMinor: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          commissionMinor: "desc",
        },
      },
      take: 12,
    });

    const storeIds = storeAggregates.map((s) => s.storeId);
    const storesMap = new Map((await db.store.findMany({ where: { id: { in: storeIds } } })).map((s) => [s.id, s]));
    const storeClicksMap = new Map();

    for (const sid of storeIds) {
      const cnt = await db.click.count({ where: { storeId: sid, createdAt: { gte: startDate } } });
      storeClicksMap.set(sid, cnt);
    }

    const topStores = storeAggregates.map((s) => {
      const storeObj = storesMap.get(s.storeId);
      const clicks = storeClicksMap.get(s.storeId) || 0;
      const convs = s._count.id;
      const comm = s._sum.commissionMinor || 0;
      const cash = s._sum.cashbackMinor || 0;
      const convRate = clicks > 0 ? (convs / clicks) * 100 : 0;

      return {
        id: s.storeId,
        storeName: storeObj ? storeObj.name : "Merchant Partner",
        clicks,
        conversions: convs,
        conversionRatePct: parseFloat(convRate.toFixed(1)),
        commissionMinor: comm,
        cashbackMinor: cash,
        netProfitMinor: comm - cash,
      };
    });

    // 3. Top Earning Coupons Real Database Aggregation
    const couponAggregates = await db.click.groupBy({
      by: ["couponId"],
      where: { couponId: { not: null }, createdAt: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    });

    const couponIds = couponAggregates.map((c) => c.couponId!).filter(Boolean);
    const couponsMap = new Map(
      (await db.coupon.findMany({ where: { id: { in: couponIds } }, include: { store: true } })).map((c) => [c.id, c])
    );

    const topCoupons = await Promise.all(
      couponAggregates.map(async (c) => {
        const cpn = couponsMap.get(c.couponId!);
        const clicks = c._count.id;
        const convs = await db.conversion.count({ where: { click: { couponId: c.couponId! }, createdAt: { gte: startDate } } });
        const comms = await db.conversion.aggregate({
          where: { click: { couponId: c.couponId! }, createdAt: { gte: startDate } },
          _sum: { commissionMinor: true },
        });
        const commissionMinor = comms._sum.commissionMinor || 0;
        const epcMinor = clicks > 0 ? Math.round(commissionMinor / clicks) : 0;

        return {
          id: c.couponId!,
          couponTitle: cpn ? cpn.title : "Discount Offer",
          storeName: cpn?.store ? cpn.store.name : "Merchant",
          clicks,
          conversions: convs,
          epcMinor,
          commissionMinor,
        };
      })
    );

    // 4. Recent Conversions (15 rows)
    const recentConversionsRaw = await db.conversion.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { store: true },
    });

    const recentConversions = recentConversionsRaw.map((c) => ({
      id: c.id,
      transactionId: c.networkTransactionId,
      storeName: c.store.name,
      saleAmountMinor: c.amountMinor,
      commissionMinor: c.commissionMinor,
      cashbackMinor: c.cashbackMinor,
      status: c.status,
      date: new Date(c.createdAt).toLocaleDateString(),
    }));

    // 5. Weekly Time Series Data for 12 Weeks (90-day range)
    const weeklyRevenuePoints = [];
    const weeklyClicksVsConvPoints = [];

    for (let w = 11; w >= 0; w--) {
      const wStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

      const [wClicks, wConvs] = await Promise.all([
        db.click.count({ where: { createdAt: { gte: wStart, lt: wEnd } } }),
        db.conversion.findMany({ where: { createdAt: { gte: wStart, lt: wEnd } } }),
      ]);

      const wComm = wConvs.reduce((sum, c) => sum + c.commissionMinor, 0);

      weeklyRevenuePoints.push({
        label: `W${12 - w}`,
        value: Math.round(wComm / 100),
        prevValue: 0,
      });

      weeklyClicksVsConvPoints.push({
        label: `W${12 - w}`,
        clicks: wClicks,
        conversions: wConvs.length,
      });
    }

    // 6. Real Commission by Category
    const categories = await db.category.findMany({ take: 5 });
    const categoryBreakdown = await Promise.all(
      categories.map(async (cat) => {
        const storeIdsInCat = (
          await db.storeCategory.findMany({
            where: { categoryId: cat.id },
            select: { storeId: true },
          })
        ).map((sc) => sc.storeId);

        const convsInCat = await db.conversion.aggregate({
          where: { storeId: { in: storeIdsInCat }, createdAt: { gte: startDate } },
          _sum: { commissionMinor: true },
        });

        return {
          label: cat.name,
          valueMinor: convsInCat._sum.commissionMinor || 0,
        };
      })
    );

    const totalsObj = {
      totalClicks: currentClicksCount,
      totalConversions: conversionsCount,
      grossCommissionMinor,
      adRevenueMinor,
      netProfitMinor,
      activeStores: activeStoresCount,
      activeCoupons: activeCouponsCount,
      clicksDelta: parseFloat(clicksDelta.toFixed(1)),
      conversionsDelta: parseFloat(conversionsDelta.toFixed(1)),
      grossCommissionDelta: parseFloat(grossCommissionDelta.toFixed(1)),
      adRevenueDelta: parseFloat(adRevenueDelta.toFixed(1)),
      netProfitDelta: parseFloat(netProfitDelta.toFixed(1)),
    };

    return NextResponse.json({
      success: true,
      totals: totalsObj,
      metrics: {
        clicks: currentClicksCount,
        clicksDelta: parseFloat(clicksDelta.toFixed(1)),
        conversions: conversionsCount,
        conversionsDelta: parseFloat(conversionsDelta.toFixed(1)),
        conversionRate: parseFloat(currentRate.toFixed(2)),
        conversionRateDelta: parseFloat(conversionRateDelta.toFixed(2)),
        grossCommissionMinor,
        grossCommissionDelta: parseFloat(grossCommissionDelta.toFixed(1)),
        cashbackPaidMinor,
        cashbackPaidDelta: parseFloat(cashbackPaidDelta.toFixed(1)),
        netProfitMinor,
        netProfitDelta: parseFloat(netProfitDelta.toFixed(1)),
      },
      topCoupons,
      topStores,
      recentConversions,
      revenueChartPoints: weeklyRevenuePoints,
      clicksVsConvPoints: weeklyClicksVsConvPoints,
      topStoresBar: topStores.map((s) => ({ label: s.storeName, valueMinor: s.commissionMinor })),
      categoryBreakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
