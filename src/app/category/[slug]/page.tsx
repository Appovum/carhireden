// ═══════════════════════════════════════════════════════════════════
// Category Page — /category/[slug]
// Light-mode paper design system, sentence-case typography,
// SVG category icons, and actionable empty-state pathways.
// ═══════════════════════════════════════════════════════════════════

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { CouponRow, StoreLogo } from "@/components/CouponRow";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonLd";
import { Coupon } from "@/types";

export const dynamic = "force-dynamic";

function getCategorySvgIcon(iconName?: string | null) {
  const name = iconName?.toLowerCase() || "";
  if (name === "shirt" || name === "apparel" || name === "fashion") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <path d="M16 3L20 7L17 11L14 8V21H10V8L7 11L4 7L8 3H16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "laptop" || name === "electronics" || name === "tech") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M1 20H23" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "sparkles" || name === "beauty") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "dumbbell" || name === "sports") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <path d="M6 5V19M18 5V19M2 9V15M22 9V15M6 12H18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "utensils" || name === "food") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
        <path d="M18 3V21M18 8H21M6 3V11M3 3V11M3 8H9M6 11V21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Generic tag fallback
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await db.category.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      stores: {
        include: {
          store: {
            include: { coupons: { where: { status: "active" } } },
          },
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  const categoryStores = category.stores.map((sc) => sc.store);

  const dbCoupons = await db.coupon.findMany({
    where: {
      store: {
        categories: {
          some: { categoryId: category.id },
        },
      },
      status: "active",
    },
    include: { store: true },
    orderBy: { usedCount: "desc" },
    take: 30,
  });

  const coupons: Coupon[] = dbCoupons.map((c) => ({
    id: c.id,
    storeId: c.storeId,
    storeName: c.store.name,
    storeSlug: c.store.slug,
    storeLogo: c.store.logoUrl || "",
    type: c.type as any,
    status: c.status as any,
    code: c.code || undefined,
    title: c.title,
    description: c.description || undefined,
    discountText: c.discountText,
    merchantUrl: c.destinationUrl || c.store.rawDestinationUrl,
    successRate: c.successRate,
    usedToday: c.usedTodayCount,
    verifiedAt: c.verifiedAt.toISOString(),
  }));

  // Fallback items for empty state so user has clear pathways to explore
  let fallbackStores: any[] = [];
  let fallbackCoupons: Coupon[] = [];

  if (coupons.length === 0) {
    const [rawStores, rawCoupons] = await Promise.all([
      db.store.findMany({
        where: { isActive: true, totalCoupons: { gt: 0 } },
        take: 6,
        orderBy: { totalCoupons: "desc" },
      }),
      db.coupon.findMany({
        where: { status: "active" },
        take: 4,
        include: { store: true },
        orderBy: { usedCount: "desc" },
      }),
    ]);
    fallbackStores = rawStores;
    fallbackCoupons = rawCoupons.map((c) => ({
      id: c.id,
      storeId: c.storeId,
      storeName: c.store.name,
      storeSlug: c.store.slug,
      storeLogo: c.store.logoUrl || "",
      type: c.type as any,
      status: c.status as any,
      code: c.code || undefined,
      title: c.title,
      description: c.description || undefined,
      discountText: c.discountText,
      merchantUrl: c.destinationUrl || c.store.rawDestinationUrl,
      successRate: c.successRate,
      usedToday: c.usedTodayCount,
      verifiedAt: c.verifiedAt.toISOString(),
    }));
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://couponpilot.com"}/` },
    { name: category.name, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://couponpilot.com"}/category/${category.slug}` },
  ]);

  const formattedCategoryName = category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {/* Category Header Hero — Clean paper surface with high contrast */}
        <section className="bg-paper-sunken border border-rule p-5 sm:p-6 rounded-[4px]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[4px] bg-paper-sunken border border-rule flex items-center justify-center flex-shrink-0 shadow-2xs">
              {getCategorySvgIcon(category.icon)}
            </div>
            <div>
              <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-ink leading-snug">
                {formattedCategoryName} promo codes & deals
              </h1>
              <p className="text-[13px] sm:text-[14px] font-body text-muted mt-0.5">
                Verified promo codes and cashback offers for top {formattedCategoryName.toLowerCase()} brands.
              </p>
            </div>
          </div>
        </section>

        {/* Category Stores — Rendered as clean brand logo cards */}
        {categoryStores.length > 0 && (
          <section className="space-y-3" aria-labelledby="category-stores-heading">
            <h2 id="category-stores-heading" className="font-display font-bold text-[16px] sm:text-[18px] text-ink">
              Popular {formattedCategoryName.toLowerCase()} stores
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {categoryStores.map((store) => (
                <Link
                  key={store.slug}
                  href={`/store/${store.slug}`}
                  className="p-3 bg-paper-raised border border-rule rounded-[4px] hover:border-rule-strong transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-2xs"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <StoreLogo logo={store.logoUrl || undefined} name={store.name} domain={store.domain} />
                  </div>
                  <span className="font-display font-semibold text-[13px] sm:text-[14px] text-ink group-hover:text-money transition-colors truncate w-full">
                    {store.name.replace(/\s*\([A-Z]{2}\)$/i, "")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Coupon Feed / Actionable Empty State */}
        {coupons.length > 0 ? (
          <section className="space-y-3">
            <div className="space-y-2.5">
              {coupons.map((coupon) => (
                <CouponRow key={coupon.id} coupon={coupon} />
              ))}
            </div>
          </section>
        ) : (
          /* Actionable Empty State (No Dead Ends) */
          <section className="space-y-8">
            <div className="bg-paper-raised border border-rule p-8 sm:p-10 rounded-[4px] text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-paper-sunken border border-rule flex items-center justify-center mx-auto text-muted">
                {getCategorySvgIcon(category.icon)}
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-display font-bold text-[18px] text-ink">
                  No active coupons for {formattedCategoryName.toLowerCase()} right now
                </h3>
                <p className="text-[13px] sm:text-[14px] font-body text-muted">
                  We verify deals continuously. Explore active stores or trending offers below while we fetch new codes.
                </p>
              </div>
              <div>
                <Link
                  href="/stores"
                  className="inline-flex items-center px-4.5 py-2 text-[13px] font-display font-bold bg-ink text-paper hover:bg-ink/90 rounded-[4px] transition-colors"
                >
                  Browse all verified stores &rsaquo;
                </Link>
              </div>
            </div>

            {/* Pathways out: Popular stores */}
            {fallbackStores.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-display font-bold text-[16px] sm:text-[18px] text-ink">
                  Popular stores with active offers
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {fallbackStores.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/store/${s.slug}`}
                      className="p-3 bg-paper-raised border border-rule rounded-[4px] hover:border-rule-strong transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-2xs"
                    >
                      <div className="w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <StoreLogo logo={s.logoUrl || undefined} name={s.name} />
                      </div>
                      <span className="font-display font-semibold text-[12px] sm:text-[13px] text-ink group-hover:text-money transition-colors truncate w-full">
                        {s.name.replace(/\s*\([A-Z]{2}\)$/i, "")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pathways out: Trending offers from other categories */}
            {fallbackCoupons.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-display font-bold text-[16px] sm:text-[18px] text-ink">
                  Trending offers in other categories
                </h3>
                <div className="space-y-2.5">
                  {fallbackCoupons.map((coupon) => (
                    <CouponRow key={coupon.id} coupon={coupon} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
