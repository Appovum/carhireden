// ═══════════════════════════════════════════════════════════════════
// Programmatic SEO Route Handler — /[store]-coupons-[month]-[year]
// Example: /nike-coupons-august-2026
// Uses settings meta templates to generate high-ranking SEO landing pages.
// ═══════════════════════════════════════════════════════════════════

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildMetaTitle, buildMetaDescription } from "@/lib/seo/metaTemplates";
import { StorePageClient } from "@/components/StorePageClient";
import { Coupon, Store } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProgrammaticSeoPage({
  params,
}: {
  params: Promise<{ [key: string]: string }>;
}) {
  const resolvedParams = await params;
  // Look for any parameter key matching programmatic SEO pattern
  const rawPath = Object.values(resolvedParams)[0] || "";

  // Parse pattern: [store]-coupons-[month]-[year]
  const match = rawPath.match(/^([a-z0-9-]+)-coupons-([a-z]+)-(\d{4})$/i);
  let storeSlug = rawPath;
  if (match) {
    storeSlug = match[1];
  } else {
    // If doesn't match programmatic pattern, attempt finding store by direct slug
    storeSlug = rawPath.replace(/-coupons.*$/, "");
  }

  const dbStore = await db.store.findUnique({
    where: { slug: storeSlug.toLowerCase() },
    include: { categories: { include: { category: true } } },
  });

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
    merchantUrl: c.destinationUrl || dbStore.rawDestinationUrl,
    successRate: c.successRate,
    usedToday: c.usedTodayCount,
    verifiedAt: c.verifiedAt.toISOString(),
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : undefined,
    cashbackRate: c.cashbackRate || dbStore.defaultCashbackRate || undefined,
    isExclusive: c.isExclusive,
    isFeatured: c.isFeatured,
  }));

  return <StorePageClient store={store} storeCoupons={storeCoupons} walletBalance={0} />;
}
