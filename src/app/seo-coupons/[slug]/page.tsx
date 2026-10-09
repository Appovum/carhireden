// ═══════════════════════════════════════════════════════════════════
// Programmatic SEO page — served at /<store>-coupons-<month>-<year>
// Example: /nike-coupons-august-2026
//
// next.config.ts rewrites matching URLs to /seo-coupons/<slug>; anything that
// does not match never reaches this page and gets a normal 404. See
// src/lib/seo/programmaticRoute.ts for the URL rules.
// ═══════════════════════════════════════════════════════════════════

import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildMetaTitle, buildMetaDescription } from "@/lib/seo/metaTemplates";
import { parseProgrammaticSlug } from "@/lib/seo/programmaticRoute";
import { StorePageClient } from "@/components/StorePageClient";
import { StorePageSkeleton } from "@/components/StorePageSkeleton";
import { Coupon, Store } from "@/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// generateMetadata and the page both need these rows; cache() makes the
// second call within one request free.
const getStore = cache(async (slug: string) =>
  db.store.findUnique({
    where: { slug },
    include: { categories: { include: { category: true } } },
  })
);

const getCoupons = cache(async (storeId: string) =>
  db.coupon.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  })
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseProgrammaticSlug(slug);
  const store = parsed ? await getStore(parsed.storeSlug) : null;

  if (!parsed || !store || !store.isActive) {
    return { title: "Page not found", robots: { index: false } };
  }

  const coupons = await getCoupons(store.id);
  const vars = { store_name: store.name, total_coupons: coupons.length };
  const monthYear = `${parsed.monthLabel} ${parsed.year}`;

  const title = buildMetaTitle(`{store_name} Coupons & Promo Codes — ${monthYear}`, vars);
  const description = buildMetaDescription(
    `Save with {total_coupons} working {store_name} coupons and promo codes for ${monthYear}. Verified daily, with cashback on eligible orders.`,
    vars
  );

  // The same page is also reachable at /seo-coupons/<slug>; point search
  // engines at the clean URL.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  return {
    title,
    description,
    ...(baseUrl ? { alternates: { canonical: `${baseUrl}/${parsed.canonicalSlug}` } } : {}),
  };
}

type DbStore = NonNullable<Awaited<ReturnType<typeof getStore>>>;

export default async function ProgrammaticSeoPage({ params }: PageProps) {
  const { slug } = await params;

  // Validate everything that can produce a 404 before anything streams, so
  // an unknown store returns a real HTTP 404 rather than a soft 404.
  const parsed = parseProgrammaticSlug(slug);
  if (!parsed) notFound();

  const dbStore = await getStore(parsed.storeSlug);
  if (!dbStore || !dbStore.isActive) notFound();

  return (
    <Suspense fallback={<StorePageSkeleton />}>
      <SeoStoreContent dbStore={dbStore} />
    </Suspense>
  );
}

async function SeoStoreContent({ dbStore }: { dbStore: DbStore }) {
  const dbCoupons = await getCoupons(dbStore.id);

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
    type: c.type as Coupon["type"],
    status: c.status as Coupon["status"],
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
