// ═══════════════════════════════════════════════════════════════════
// Full Search Results Page — /search?q=...
// Grouped search results for Stores, Categories, and Coupons with pagination.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { db } from "@/lib/db";
import { CouponRow } from "@/components/CouponRow";
import { Coupon } from "@/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [matchingStores, matchingCategories, dbCoupons] = await Promise.all([
    query
      ? db.store.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query } },
              { domain: { contains: query.toLowerCase() } },
            ],
          },
          take: 8,
        })
      : [],
    query
      ? db.category.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { slug: { contains: query.toLowerCase() } },
            ],
          },
          take: 8,
        })
      : [],
    query
      ? db.coupon.findMany({
          where: {
            status: "active",
            OR: [
              { title: { contains: query } },
              { discountText: { contains: query } },
              { store: { name: { contains: query } } },
            ],
          },
          include: { store: true },
          take: 20,
        })
      : [],
  ]);

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

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Search Header */}
      <section className="bg-paper-raised border border-rule p-6 rounded-[4px] space-y-4 font-body">
        <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink">
          {query ? `Search Results for "${query}"` : "Search Coupons & Stores"}
        </h1>
        <form action="/search" method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search store, brand, or discount..."
            className="flex-1 bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] font-body text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-ink text-paper font-medium text-[14px] font-body rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            Search
          </button>
        </form>
      </section>

      {/* Matching Stores Group */}
      {matchingStores.length > 0 && (
        <section className="space-y-3 font-body">
          <h2 className="font-display text-[18px] font-bold text-ink">Matching Stores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {matchingStores.map((store) => (
              <Link
                key={store.id}
                href={`/store/${store.slug}`}
                className="bg-paper-raised border border-rule p-3.5 rounded-[4px] hover:border-rule-strong transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-[3px] bg-paper-sunken border border-rule flex items-center justify-center font-display font-bold text-ink text-[14px]">
                  {store.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">{store.name}</div>
                  <div className="text-[11px] text-muted truncate">{store.defaultCashbackRate || "Cashback Available"}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Matching Categories Group */}
      {matchingCategories.length > 0 && (
        <section className="space-y-3 font-body">
          <h2 className="font-display text-[18px] font-bold text-ink">Matching Categories</h2>
          <div className="flex flex-wrap gap-2">
            {matchingCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="px-3.5 py-2 bg-paper-raised border border-rule rounded-[3px] text-[13px] text-ink font-medium hover:border-rule-strong transition-colors flex items-center gap-2"
              >
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Matching Coupons List */}
      <section className="space-y-4 font-body">
        <h2 className="font-display text-[18px] font-bold text-ink">
          {coupons.length > 0 ? `Matching Offers (${coupons.length})` : query ? "No matching coupon codes found" : "Enter a search term above"}
        </h2>

        {coupons.length > 0 ? (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <CouponRow key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : query ? (
          <div className="p-8 bg-paper-raised border border-rule rounded-[4px] text-center space-y-2">
            <p className="text-[14px] text-muted">No coupons matched your query &quot;{query}&quot;.</p>
            <Link href="/stores" className="text-[13px] font-semibold text-ink hover:underline">
              Browse our full A–Z Store Directory →
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
