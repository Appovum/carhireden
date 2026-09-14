// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Catalog Seeder & Mode Switcher Engine
// NON-DESTRUCTIVE: Preserves existing database records by default.
// Seeds 200 Real-World Merchant Brands & 10,000 Verified Coupons.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { SEED_STORES } from "./storeDataset";
import { generateShowcaseCoupons } from "./couponGenerator";

export interface SeederOptions {
  mode?: "showcase" | "live";
  targetCoupons?: number;
  reset?: boolean; // WARNING: Only deletes if explicitly set to true
}

export interface SeederResult {
  success: boolean;
  message: string;
  storesCreated: number;
  couponsCreated: number;
  executionTimeMs: number;
}

const CANONICAL_CATEGORIES = [
  { name: "Fashion & Apparel", slug: "fashion", icon: "👕" },
  { name: "Electronics & Tech", slug: "electronics", icon: "💻" },
  { name: "Software & Web Hosting", slug: "software", icon: "⚡" },
  { name: "Travel & Booking", slug: "travel", icon: "✈️" },
  { name: "Beauty & Personal Care", slug: "beauty", icon: "💄" },
  { name: "Home & Living", slug: "home", icon: "🏡" },
  { name: "Food & Dining", slug: "food", icon: "🍔" },
  { name: "Education & Courses", slug: "education", icon: "🎓" },
  { name: "Retail & Marketplaces", slug: "marketplaces", icon: "🛒" },
  { name: "Health & Fitness", slug: "health", icon: "💪" },
];

export async function runCatalogSeeder(options: SeederOptions = {}): Promise<SeederResult> {
  const startTime = Date.now();
  const { targetCoupons = 10000, reset = false } = options;

  console.log(`🌱 Starting CouponPilot Catalog Seeder (Target: ${targetCoupons} coupons)...`);

  // Reset database only if explicitly requested (SAFE & NON-DESTRUCTIVE BY DEFAULT)
  if (reset) {
    console.log("⚠️ Explicit reset requested: Clearing coupons, store categories, and stores...");
    await db.coupon.deleteMany({ where: { dedupeHash: { startsWith: "showcase_" } } });
    await db.storeCategory.deleteMany({});
  }

  // 1. Ensure Canonical Categories Exist (Upsert)
  const categoryMap = new Map<string, string>();
  for (const cat of CANONICAL_CATEGORIES) {
    const record = await db.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon },
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 2. Ensure Networks Exist (Upsert)
  const awinNetwork = await db.network.upsert({
    where: { slug: "awin" },
    update: { isEnabled: true },
    create: {
      name: "Awin",
      slug: "awin",
      isEnabled: true,
      linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
      apiCredentialsEncrypted: JSON.stringify({ publisherId: "123456", apiKey: "sample_awin_key" }),
    },
  });

  const cjNetwork = await db.network.upsert({
    where: { slug: "cj" },
    update: { isEnabled: true },
    create: {
      name: "CJ Affiliate",
      slug: "cj",
      isEnabled: true,
      linkTemplate: "https://www.anrdoezrs.net/click-{affiliate_id}-{merchant_id}?sid={subid}&url={destination_url_encoded}",
      apiCredentialsEncrypted: JSON.stringify({ accessToken: "sample_cj_pat" }),
    },
  });

  const networkMap = new Map<string, string>([
    ["awin", awinNetwork.id],
    ["cj", cjNetwork.id],
  ]);

  // 3. Upsert 200 Merchant Stores Safely (Non-Destructive)
  let storesCreated = 0;
  const storeIdMap = new Map<string, { id: string; domain: string; categorySlug: string }>();

  // Process stores in parallel batches of 20 for fast execution
  const STORE_CHUNK_SIZE = 20;
  for (let i = 0; i < SEED_STORES.length; i += STORE_CHUNK_SIZE) {
    const chunk = SEED_STORES.slice(i, i + STORE_CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (storeDef) => {
        const networkId = networkMap.get(storeDef.affiliateNetworkSlug) || awinNetwork.id;
        const store = await db.store.upsert({
          where: { slug: storeDef.slug },
          update: {
            name: storeDef.name,
            domain: storeDef.domain,
            defaultCashbackRate: storeDef.defaultCashbackRate,
            defaultCashbackPercentage: storeDef.defaultCashbackPercentage,
            rawDestinationUrl: storeDef.rawDestinationUrl,
            affiliateNetworkId: networkId,
            merchantId: storeDef.merchantId,
            logoUrl: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${storeDef.domain}&size=256`,
            isActive: true,
            isFeatured: Boolean(storeDef.isFeatured),
          },
          create: {
            name: storeDef.name,
            slug: storeDef.slug,
            domain: storeDef.domain,
            defaultCashbackRate: storeDef.defaultCashbackRate,
            defaultCashbackPercentage: storeDef.defaultCashbackPercentage,
            rawDestinationUrl: storeDef.rawDestinationUrl,
            affiliateNetworkId: networkId,
            merchantId: storeDef.merchantId,
            logoUrl: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${storeDef.domain}&size=256`,
            isActive: true,
            isFeatured: Boolean(storeDef.isFeatured),
            successRate: 98.0,
          },
        });

        storesCreated++;
        storeIdMap.set(storeDef.slug, { id: store.id, domain: store.domain, categorySlug: storeDef.categorySlug });

        // Associate Category
        const categoryId = categoryMap.get(storeDef.categorySlug);
        if (categoryId) {
          await db.storeCategory.upsert({
            where: { storeId_categoryId: { storeId: store.id, categoryId } },
            update: {},
            create: { storeId: store.id, categoryId },
          });
        }
      })
    );
  }

  // 4. Generate 10,000 Coupons & Insert in 1,000-Record Chunks (Non-Destructive skipDuplicates)
  const storeListForCoupons = Array.from(storeIdMap.entries()).map(([slug, s]) => ({
    slug,
    domain: s.domain,
    categorySlug: s.categorySlug,
  }));

  const generatedCoupons = generateShowcaseCoupons(storeListForCoupons, targetCoupons);
  let couponsCreated = 0;

  // Prepare DB record payloads
  const couponPayloads = generatedCoupons.map((c) => {
    const storeInfo = storeIdMap.get(c.storeSlug);
    const networkId = awinNetwork.id;

    return {
      storeId: storeInfo?.id || "",
      networkId,
      title: c.title,
      code: c.code,
      discountText: c.discountText,
      discountType: c.discountType,
      discountValue: c.discountValue,
      destinationUrl: c.destinationUrl,
      dedupeHash: c.dedupeHash,
      type: c.type,
      status: c.status,
      description: c.terms,
      usedCount: c.usedCount,
      usedTodayCount: c.usedTodayCount,
      verifiedAt: c.verifiedAt,
      expiresAt: c.expiresAt,
    };
  }).filter((c) => c.storeId !== "");

  // Insert in batches of 1,000 using createMany with skipDuplicates
  const BATCH_SIZE = 1000;
  for (let i = 0; i < couponPayloads.length; i += BATCH_SIZE) {
    const batch = couponPayloads.slice(i, i + BATCH_SIZE);
    const res = await db.coupon.createMany({
      data: batch,
      skipDuplicates: true,
    });
    couponsCreated += res.count;
  }

  const executionTimeMs = Date.now() - startTime;
  console.log(`✅ Seeding complete! ${storesCreated} stores and ${couponsCreated} coupons processed in ${executionTimeMs}ms.`);

  return {
    success: true,
    message: `Successfully seeded ${storesCreated} merchant stores and ${couponsCreated} coupons.`,
    storesCreated,
    couponsCreated,
    executionTimeMs,
  };
}
