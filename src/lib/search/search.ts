// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Search & Autocomplete Engine
// Search stores, categories, and coupons with prefix matching.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { SearchResult } from "@/types";

export async function autocompleteSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) {
    // Return top stores if query is blank
    const topStores = await db.store.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { totalCoupons: "desc" },
    });
    return topStores.map((s) => ({
      type: "store" as const,
      label: s.name,
      slug: s.slug,
      subtitle: `${s.totalCoupons} coupons available`,
      logo: s.logoUrl || undefined,
      domain: s.domain,
    }));
  }

  const [matchingStores, matchingCategories] = await Promise.all([
    db.store.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { slug: { contains: q.toLowerCase() } },
          { domain: { contains: q.toLowerCase() } },
        ],
      },
      take: 5,
    }),
    db.category.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q.toLowerCase() } },
        ],
      },
      take: 5,
    }),
  ]);

  const storeResults: SearchResult[] = matchingStores.map((s) => ({
    type: "store",
    label: s.name,
    slug: s.slug,
    subtitle: `${s.totalCoupons} coupons`,
    logo: s.logoUrl || undefined,
    domain: s.domain,
  }));

  const categoryResults: SearchResult[] = matchingCategories.map((c) => ({
    type: "category",
    label: c.name,
    slug: c.slug,
    subtitle: "Category",
  }));

  return [...storeResults, ...categoryResults];
}
