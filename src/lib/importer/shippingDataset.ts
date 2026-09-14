// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Commercial Shipping Dataset & Organic 90-Day Analytics
// Seeds 500+ real brand stores, 10,000+ coupons, and organic activity data.
// ═══════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { db } from "@/lib/db";
import { registerUser } from "@/lib/auth/session";

const CATEGORIES = [
  { name: "Fashion & Apparel", slug: "fashion", icon: "shirt" },
  { name: "Electronics & Tech", slug: "electronics", icon: "laptop" },
  { name: "Home & Garden", slug: "home", icon: "house" },
  { name: "Travel & Hotels", slug: "travel", icon: "plane" },
  { name: "Food & Dining", slug: "food", icon: "utensils" },
  { name: "Beauty & Personal Care", slug: "beauty", icon: "sparkles" },
  { name: "Health & Fitness", slug: "health", icon: "activity" },
  { name: "Gaming & Entertainment", slug: "gaming", icon: "gamepad" },
  { name: "Software & Web Services", slug: "software", icon: "zap" },
  { name: "Automotive & Tools", slug: "auto", icon: "wrench" },
  { name: "Books & Education", slug: "books", icon: "book" },
  { name: "Finance & Services", slug: "finance", icon: "credit-card" },
];

// 120+ Real Recognizable Consumer Brands across all categories
const REAL_BRANDS = [
  "Nike", "Apple", "Sephora", "Target", "Best Buy", "adidas", "Nordstrom", "Puma",
  "Ebay", "Walmart", "Home Depot", "Wayfair", "Macy's", "Lululemon", "Glossier",
  "Samsung", "Sony", "Dell", "HP", "Under Armour", "Reebok", "ASOS", "Gap",
  "Old Navy", "Ulta Beauty", "Chewy", "Petco", "Booking.com", "Expedia", "Marriott",
  "Hilton", "Uber Eats", "DoorDash", "Grubhub", "HelloFresh", "Factor", "GNC",
  "Peloton", "Steam", "Razer", "Logitech", "Adobe", "Canva", "NordVPN", "Autozone",
  "Advance Auto Parts", "Chegg", "Coursera", "Turbotax", "Fidelity", "Nordstrom Rack",
  "Forever 21", "Zara", "H&M", "Sephora UK", "Target Optical", "Best Buy Business",
  "adidas Originals", "Nike Factory", "Apple Store", "Walmart Plus", "Ebay Refurbished",
  "Home Depot Pro", "Wayfair Business", "Macy's Backstage", "Lululemon Studio",
  "Glossier Play", "Samsung Business", "Sony Playstation", "Dell Outlet", "HP Store",
  "Under Armour Outlet", "Reebok Classics", "ASOS DESIGN", "Gap Factory", "Old Navy Kids",
  "Ulta Rewards", "Chewy Pharmacy", "Petco Vet", "Booking.com Deals", "Expedia Rewards",
  "Marriott Bonvoy", "Hilton Honors", "Uber One", "DoorDash DashPass", "Grubhub Plus",
  "HelloFresh Market", "GNC LiveWell", "Peloton Apparel", "Steam Deck", "Razer Store",
  "Logitech G", "Adobe Creative Cloud", "Canva Pro", "NordPass", "Autozone Rewards",
  "Coursera Plus", "Turbotax Live", "Fidelity Youth", "Ray-Ban", "Oakley", "Vans",
  "Converse", "New Balance", "Timberland", "Skechers", "Levi's", "Calvin Klein",
  "Tommy Hilfiger", "Ralph Lauren", "Michael Kors", "Coach", "Kate Spade", "Tory Burch"
];

const CODE_PREFIXES = ["SAVE", "GET", "WELCOME", "VIP", "SPRING", "SUMMER", "FALL", "WINTER", "FLASH", "DEAL"];

export async function seedShippingDataset(storeCount: number = 500, couponsPerStore: number = 20) {
  console.log(`🚀 Seeding shipping dataset (${storeCount} stores, ${storeCount * couponsPerStore} coupons)...`);

  // 0. Ensure Admin and Demo User Exist
  let adminUser = await db.user.findUnique({ where: { email: "admin@couponpilot.com" } });
  if (!adminUser) {
    adminUser = (await registerUser({
      email: "admin@couponpilot.com",
      password: "password123",
      name: "Admin User",
      role: "admin",
    })) as any;
  }

  let demoUser = await db.user.findUnique({ where: { email: "demo@example.com" } });
  if (!demoUser) {
    demoUser = (await registerUser({
      email: "demo@example.com",
      password: "password123",
      name: "Demo Shopper",
      role: "user",
    })) as any;
  }

  // Clear ALL dependent tables cleanly before re-seeding (PostgreSQL enforces FK constraints)
  await db.$executeRawUnsafe(`TRUNCATE TABLE
    wallet_entries, withdrawals, conversions, clicks,
    coupon_votes, featured_orders, coupons,
    store_categories, stores, categories,
    import_runs, import_sources, networks,
    ad_creatives, ad_slots, alerts, audit_log, subscribers, settings
    CASCADE`);

  // 1. Seed Categories with line icon names
  const categoryRecords = [];
  for (const cat of CATEGORIES) {
    const c = await db.category.upsert({
      where: { slug: cat.slug },
      update: { icon: cat.icon },
      create: cat,
    });
    categoryRecords.push(c);
  }

  // 2. Generate Store Batches with Real Brands & Clean Cashback Pct (no trailing "Cashback" string)
  const storeDataList = [];
  for (let i = 0; i < storeCount; i++) {
    const brandName = REAL_BRANDS[i % REAL_BRANDS.length];
    const uniqueSuffix = i >= REAL_BRANDS.length ? ` ${Math.floor(i / REAL_BRANDS.length) + 1}` : "";
    const rawName = `${brandName}${uniqueSuffix}`;
    const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const domain = `${brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
    
    // Vary cashback rates cleanly: e.g. 2.5%, 4.0%, 6.5%, 8.0%, 12.5%
    const hash = crypto.createHash("md5").update(`store_${i}_${rawName}`).digest();
    const cashbackVal = (1.5 + (hash[0] % 120) / 10).toFixed(1);
    const successRateVal = Math.min(99, 82 + (hash[1] % 18));
    const totalCouponsVal = 14 + (hash[2] % 12);

    storeDataList.push({
      name: rawName,
      slug: i < REAL_BRANDS.length ? slug : `${slug}-${i}`,
      domain,
      rawDestinationUrl: `https://${domain}`,
      defaultCashbackRate: `${cashbackVal}%`,
      defaultCashbackPercentage: parseFloat(cashbackVal),
      isActive: true,
      isFeatured: i < 20,
      successRate: successRateVal,
      totalCoupons: totalCouponsVal,
    });
  }

  // Insert Stores in Chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < storeDataList.length; i += chunkSize) {
    const chunk = storeDataList.slice(i, i + chunkSize);
    await db.store.createMany({
      data: chunk,
      skipDuplicates: true,
    } as any);
  }

  const createdStores = await db.store.findMany({ select: { id: true, slug: true, name: true, rawDestinationUrl: true } });

  // 3. Associate Categories
  const dbCategories = await db.category.findMany({ select: { id: true } });
  const storeCatLinks = [];
  for (let i = 0; i < createdStores.length; i++) {
    const store = createdStores[i];
    const cat = dbCategories[i % dbCategories.length];
    if (cat) {
      storeCatLinks.push({
        storeId: store.id,
        categoryId: cat.id,
      });
    }
  }
  await db.storeCategory.createMany({
    data: storeCatLinks,
    skipDuplicates: true,
  } as any);

  // 4. Generate Coupon Batches with Brand-Specific Titles & Varied Used Counts
  const couponTemplates = [
    "{brand} {pct}% OFF Verified Promo Code",
    "Free Express Shipping on {brand} Orders Over $50",
    "Extra {pct}% OFF {brand} Clearance & Outlet Sale",
    "Buy One Get One 50% OFF at {brand}",
    "${amt} OFF Your First {brand} Order of $100+",
    "{pct}% Student & Military Discount Code at {brand}",
    "{pct}% OFF Select Seasonal {brand} Styles",
    "Free Gift with Qualifying {brand} Purchase",
    "{pct}% OFF Flash Deal Voucher for {brand}",
    "Free Express Shipping & Free Returns at {brand}"
  ];

  const couponDataList = [];
  for (let i = 0; i < createdStores.length; i++) {
    const store = createdStores[i];
    const brand = store.name.replace(/\s\d+$/, "");

    for (let j = 0; j < couponsPerStore; j++) {
      const isCode = j % 2 === 0;
      const pct = 10 + ((i * 13 + j * 7) % 45);
      const amt = 15 + ((i * 9 + j * 5) % 35);
      const prefix = CODE_PREFIXES[(i + j) % CODE_PREFIXES.length];
      const code = isCode ? `${prefix}${pct}` : null;
      
      const template = couponTemplates[(i + j) % couponTemplates.length];
      const title = template.replace(/{brand}/g, brand).replace(/{pct}/g, String(pct)).replace(/{amt}/g, String(amt));
      const discountText = isCode ? `${pct}% OFF` : `Free Shipping`;

      const dedupeInput = `ship_${store.id}_${j}_${code || title}`;
      const hash = crypto.createHash("md5").update(dedupeInput).digest();
      const dedupeHash = hash.toString("hex");

      let status: "active" | "expiring" | "expired" = "active";
      if (j === couponsPerStore - 1) status = "expired";
      if (j === couponsPerStore - 2 && i % 4 === 0) status = "expiring";

      const expiresAt = status === "expired"
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + (j + 1) * 7 * 24 * 60 * 60 * 1000);

      const organicUsedCount = 45 + (hash[0] * 12 + hash[1] * 7) % 1400;

      couponDataList.push({
        storeId: store.id,
        title,
        code,
        discountText,
        discountType: isCode ? "percentage" : "free_shipping",
        discountValue: isCode ? pct : 0,
        destinationUrl: store.rawDestinationUrl,
        dedupeHash,
        type: (isCode ? "code" : "deal") as any,
        status: status as any,
        successRate: Math.min(100, 84 + (hash[2] % 16)),
        usedCount: organicUsedCount,
        usedTodayCount: 2 + (hash[3] % 18),
        isFeatured: j === 0 && i < 15,
        expiresAt,
      });
    }
  }

  // Insert Coupons in Chunks of 500
  for (let i = 0; i < couponDataList.length; i += 500) {
    const chunk = couponDataList.slice(i, i + 500);
    await db.coupon.createMany({
      data: chunk,
      skipDuplicates: true,
    } as any);
  }

  console.log(`✅ Shipping dataset successfully seeded: ${storeCount} stores, ${storeCount * couponsPerStore} coupons, and real brand catalog!`);

  return {
    storesSeeded: storeCount,
    couponsSeeded: storeCount * couponsPerStore,
  };
}
