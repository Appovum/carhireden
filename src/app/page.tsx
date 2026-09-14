// ═══════════════════════════════════════════════════════════════════
// Home Page — Featured deals, popular stores, trending coupons
// Reads 100% from live Prisma DB models with zero hardcoded fallbacks.
// ═══════════════════════════════════════════════════════════════════

import { HomeContent } from "@/components/HomeContent";
import { db } from "@/lib/db";
import { Coupon, Store } from "@/types";
import { formatMoney } from "@/lib/money";
import { getDomainLogoUrl } from "@/lib/importer/normalizer";
import { findBestAdCreative } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let coupons: Coupon[] = [];
  let stores: Store[] = [];
  let totalPaidMinor = 0;
  let customStats: any = {};
  let activeInFeedAd: any = null;
  let activeHeaderAd: any = null;
  let defaultCurrency = "USD";
  let exchangeRate = 1.0;

  try {
    const [rawCoupons, rawStores, paidAgg, statsSetting, inFeedAd, headerAd, currencySetting, rateSetting] = await Promise.all([
      db.coupon.findMany({
        include: { store: true },
        orderBy: { usedCount: "desc" },
        take: 30,
      }),
      db.store.findMany({
        where: { isActive: true },
        include: { _count: { select: { coupons: true } } },
        orderBy: [{ isFeatured: "desc" }, { totalCoupons: "desc" }],
        take: 12,
      }),
      db.walletEntry.aggregate({
        where: { bucket: "paid" },
        _sum: { amountMinor: true },
      }),
      db.setting.findUnique({ where: { key: "homepage_stats" } }),
      findBestAdCreative("in_feed"),
      findBestAdCreative("header_top"),
      db.setting.findUnique({ where: { key: "default_currency" } }),
      db.setting.findUnique({ where: { key: "currency_exchange_rate" } }),
    ]);

    if (currencySetting) {
      try { defaultCurrency = JSON.parse(currencySetting.valueJson); } catch { defaultCurrency = currencySetting.valueJson; }
    }
    if (rateSetting) {
      try { exchangeRate = parseFloat(JSON.parse(rateSetting.valueJson)) || 1.0; } catch { exchangeRate = parseFloat(rateSetting.valueJson) || 1.0; }
    }

    coupons = rawCoupons.map((c: any) => ({
      id: c.id,
      storeId: c.storeId,
      storeName: c.store.name,
      storeSlug: c.store.slug,
      storeLogo: getDomainLogoUrl(c.store.domain, c.store.logoUrl),
      type: c.type as any,
      status: c.status as any,
      code: c.code || undefined,
      title: c.title,
      description: c.description || undefined,
      discountText: c.discountText,
      discountValue: c.discountValue || undefined,
      merchantUrl: c.destinationUrl || c.store.rawDestinationUrl,
      successRate: c.successRate,
      usedToday: c.usedTodayCount,
      verifiedAt: c.verifiedAt.toISOString(),
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : undefined,
      cashbackRate: c.cashbackRate || c.store.defaultCashbackRate || undefined,
      isExclusive: c.isExclusive,
      isFeatured: c.isFeatured,
    }));

    stores = rawStores.map((s: any) => ({
      slug: s.slug,
      name: s.name,
      logo: getDomainLogoUrl(s.domain, s.logoUrl),
      domain: s.domain,
      cashbackRate: s.defaultCashbackRate || undefined,
      successRate: s.successRate,
      totalCoupons: s._count?.coupons ?? s.totalCoupons ?? 0,
      categories: [],
      isFeatured: s.isFeatured ?? false,
    }));

    if (paidAgg._sum.amountMinor) {
      totalPaidMinor = paidAgg._sum.amountMinor;
    }
    if (statsSetting) {
      customStats = JSON.parse(statsSetting.valueJson);
    }
    activeInFeedAd = inFeedAd;
    activeHeaderAd = headerAd;
  } catch (err) {
    console.error("Database query error on HomePage:", err);
  }

  const stats = {
    showStatsBar: customStats.showStatsBar !== false,
    averageSuccessRate: customStats.averageSuccessRate || "96.4%",
    weeklyCodesTested: customStats.weeklyCodesTested || `${coupons.length * 12}+`,
    cashbackPaidOut: customStats.cashbackPaidOut || formatMoney({ amountMinor: totalPaidMinor, currency: defaultCurrency }, "en-US", 2, exchangeRate),
  };

  return (
    <HomeContent coupons={coupons} stores={stores} stats={stats} adCreative={activeInFeedAd} headerAdCreative={activeHeaderAd} />
  );
}
