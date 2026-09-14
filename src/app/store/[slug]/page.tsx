// ═══════════════════════════════════════════════════════════════════
// Store Page — /store/[slug]
// Server component querying Prisma DB and passing real data to StorePageClient.
// ═══════════════════════════════════════════════════════════════════

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Coupon, Store } from "@/types";
import { StorePageClient } from "@/components/StorePageClient";
import { findBestAdCreative } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let dbStore = await db.store.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
    },
  });

  if (!dbStore) {
    dbStore = await db.store.findUnique({
      where: { id: slug },
      include: {
        categories: { include: { category: true } },
      },
    });
  }

  if (!dbStore || !dbStore.isActive) {
    notFound();
  }

  const dbCoupons = await db.coupon.findMany({
    where: { storeId: dbStore.id },
    orderBy: { createdAt: "desc" },
  });

  const store: Store = {
    slug: dbStore.slug,
    name: dbStore.name,
    logo: dbStore.logoUrl || "",
    domain: dbStore.domain,
    cashbackRate: dbStore.defaultCashbackRate || undefined,
    successRate: dbStore.successRate,
    totalCoupons: dbCoupons.length,
    categories: dbStore.categories.map((c) => c.category.name),
    isFeatured: dbStore.isFeatured,
  };

  const storeCoupons: Coupon[] = dbCoupons.map((c) => ({
    id: c.id,
    storeId: c.storeId,
    storeName: dbStore.name,
    storeSlug: dbStore.slug,
    storeLogo: dbStore.logoUrl || "",
    type: c.type as any,
    status: c.status as any,
    code: c.code || undefined,
    title: c.title,
    description: c.description || undefined,
    discountText: c.discountText,
    discountValue: c.discountValue || undefined,
    merchantUrl: c.destinationUrl || dbStore.rawDestinationUrl,
    successRate: c.successRate,
    usedToday: c.usedTodayCount,
    verifiedAt: c.verifiedAt.toISOString(),
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : undefined,
    cashbackRate: c.cashbackRate || dbStore.defaultCashbackRate || undefined,
    isExclusive: c.isExclusive,
    isFeatured: c.isFeatured,
  }));

  const [inFeedAd, sidebarAd, headerAd] = await Promise.all([
    findBestAdCreative("in_feed"),
    findBestAdCreative("store_sidebar"),
    findBestAdCreative("header_top"),
  ]);

  return (
    <StorePageClient
      store={store}
      storeCoupons={storeCoupons}
      adCreative={inFeedAd}
      sidebarAdCreative={sidebarAd}
      headerAdCreative={headerAd}
    />
  );
}
