// ═══════════════════════════════════════════════════════════════════
// Seed Ad Banners — Creates clean, on-brand ad creatives using
// custom_html for pixel-perfect sizing that matches CouponPilot UI.
// Initialized with 0 impressions & 0 clicks for 100% real tracking.
// Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-ad-banners.ts
// ═══════════════════════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function seedAds() {
  console.log("🧹 Clearing old ad creatives...");
  await db.adCreative.deleteMany({});
  await db.adSlot.deleteMany({});

  // ── Create slots ──
  const headerSlot = await db.adSlot.create({
    data: { name: "Header Top Leaderboard", positionSlug: "header_top" },
  });
  const sidebarSlot = await db.adSlot.create({
    data: { name: "Store Sidebar Banner", positionSlug: "store_sidebar" },
  });
  const inFeedSlot = await db.adSlot.create({
    data: { name: "Coupon In-Feed Banner", positionSlug: "in_feed" },
  });

  // ── 1. Header Top Banner (728×90) — Custom HTML ──
  await db.adCreative.create({
    data: {
      adSlotId: headerSlot.id,
      title: "CouponPilot — Save up to 50%",
      type: "custom_html",
      htmlContent: `<a href="/stores" style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:728px;height:90px;margin:0 auto;padding:0 28px;background:#faf8f5;border:1px solid #e8e4df;border-radius:4px;text-decoration:none;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;overflow:hidden"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a08b6d">CouponPilot</span><span style="font-size:20px;font-weight:700;color:#1a1a19;line-height:1.2">Save up to 50% at top brands</span></div><span style="flex-shrink:0;padding:10px 20px;background:#1a1a19;color:#faf8f5;font-size:13px;font-weight:600;border-radius:4px;white-space:nowrap">Browse Deals →</span></a>`,
      isEnabled: true,
      impressionCount: 0,
      clickCount: 0,
    },
  });

  // ── 2. Store Sidebar Banner (300×250) — Custom HTML ──
  await db.adCreative.create({
    data: {
      adSlotId: sidebarSlot.id,
      title: "Pilot Pay — $15 Bonus Credit",
      type: "custom_html",
      htmlContent: `<a href="/wallet" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:300px;height:250px;margin:0 auto;padding:24px;background:#faf8f5;border:1px solid #e8e4df;border-radius:4px;text-decoration:none;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;text-align:center;gap:8px"><span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a08b6d">Pilot Pay</span><span style="font-size:48px;font-weight:800;color:#1a1a19;line-height:1">$15</span><span style="font-size:15px;color:#6b6560;line-height:1.4">Bonus credit on your<br>first purchase</span><span style="margin-top:8px;padding:10px 24px;background:#1a1a19;color:#faf8f5;font-size:13px;font-weight:600;border-radius:4px;white-space:nowrap">Claim Bonus →</span></a>`,
      isEnabled: true,
      impressionCount: 0,
      clickCount: 0,
    },
  });

  // ── 3. In-Feed Banner (full-width × 120px) — Custom HTML ──
  await db.adCreative.create({
    data: {
      adSlotId: inFeedSlot.id,
      title: "Summer Sale — 40% Off Fashion",
      type: "custom_html",
      htmlContent: `<a href="/stores" style="display:flex;align-items:center;justify-content:space-between;width:100%;height:100px;padding:0 28px;background:#faf8f5;border:1px solid #e8e4df;border-radius:4px;text-decoration:none;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;overflow:hidden"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a08b6d">Sponsored</span><span style="font-size:18px;font-weight:700;color:#1a1a19;line-height:1.2">Summer Sale — Up to 40% off fashion</span><span style="font-size:13px;color:#6b6560;margin-top:2px">Verified deals from top fashion brands</span></div><span style="flex-shrink:0;padding:10px 20px;background:#1a1a19;color:#faf8f5;font-size:13px;font-weight:600;border-radius:4px;white-space:nowrap">Shop Now →</span></a>`,
      isEnabled: true,
      impressionCount: 0,
      clickCount: 0,
    },
  });

  console.log("✅ Seeded 3 clean custom_html ad creatives initialized at 0 impressions & clicks.");

  await db.$disconnect();
}

seedAds().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
