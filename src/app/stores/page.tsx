// ═══════════════════════════════════════════════════════════════════
// A-Z Store Directory Page — /stores
// Alphabet jump navigation and grouped store index with logo images.
// Paper theme system, data-driven 0-offer exclusion, and interactive search.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { StoresClient } from "@/components/StoresClient";

export const dynamic = "force-dynamic";

export default async function StoresDirectoryPage() {
  let stores: any[] = [];

  try {
    stores = await db.store.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { coupons: { where: { status: "active" } } } },
      },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    });
  } catch (err) {
    console.error("Failed to fetch stores for A-Z directory:", err);
  }

  const formattedStores = stores.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    domain: s.domain,
    logoUrl: s.logoUrl,
    totalCoupons: s._count?.coupons ?? s.totalCoupons ?? 0,
    defaultCashbackRate: s.defaultCashbackRate,
    isFeatured: s.isFeatured ?? false,
  }));

  const activeStores = formattedStores.filter((s) => s.totalCoupons > 0);
  const comingSoonStores = formattedStores.filter((s) => s.totalCoupons === 0);

  return (
    <main className="flex-1 max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-8 w-full">
      <StoresClient activeStores={activeStores} comingSoonStores={comingSoonStores} />
    </main>
  );
}
