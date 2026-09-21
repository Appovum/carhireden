// Direct DB seed for 3 sample ads — Pure Black & White, Full Width & Height
// Run: npx tsx scripts/seed-sample-ads.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const sampleAds = [
  {
    slotPosition: "header_top",
    title: "Unlock Exclusive 20% Off",
    type: "custom_html",
    htmlContent: `<a href="https://couponpilot.com/promote" target="_blank" rel="noopener" style="text-decoration:none;display:block;width:100%;height:100%">
  <div style="background:#1A1A1F;color:#FFFFFF;border-radius:4px;padding:0 24px;height:100%;min-height:90px;display:flex;align-items:center;justify-content:space-between;font-family:'Space Grotesk',-apple-system,sans-serif;box-sizing:border-box;gap:20px;width:100%">
    <div style="display:flex;flex-direction:column;justify-content:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#A1A1AA;margin-bottom:4px">FEATURED PARTNER</div>
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.4px;line-height:1.2;color:#FFFFFF">Unlock Exclusive 20% Off Top Verified Brands</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#D4D4D8;margin-top:2px">Instant code verification at checkout • Single click copy</div>
    </div>
    <div style="background:#FFFFFF;color:#1A1A1F;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:12px;padding:12px 22px;border-radius:3px;white-space:nowrap;flex-shrink:0;letter-spacing:0.5px;text-transform:uppercase">GET CODE →</div>
  </div>
</a>`,
  },
  {
    slotPosition: "in_feed",
    title: "Exclusive $25 Off Order",
    type: "custom_html",
    htmlContent: `<a href="https://couponpilot.com/stores" target="_blank" rel="noopener" style="text-decoration:none;display:block;width:100%;height:100%">
  <div style="background:#000000;color:#FFFFFF;border-radius:4px;padding:0 24px;height:100%;min-height:90px;display:flex;align-items:center;justify-content:space-between;font-family:'Space Grotesk',-apple-system,sans-serif;box-sizing:border-box;gap:20px;width:100%;border:1px solid #333333">
    <div style="display:flex;align-items:center;gap:16px">
      <div style="background:#FFFFFF;color:#000000;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:16px;padding:8px 14px;border-radius:2px;letter-spacing:-0.5px;flex-shrink:0">$25 OFF</div>
      <div style="display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:16px;font-weight:700;letter-spacing:-0.3px;color:#FFFFFF">Limited-Time Site-Wide Discount Code</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A1A1AA;margin-top:2px">Applicable on orders over $100 • Verified 100% working</div>
      </div>
    </div>
    <div style="background:#FFFFFF;color:#000000;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:12px;padding:10px 20px;border-radius:3px;white-space:nowrap;flex-shrink:0;letter-spacing:0.5px;text-transform:uppercase">CLAIM OFFER →</div>
  </div>
</a>`,
  },
  {
    slotPosition: "store_sidebar",
    title: "Special VIP Cash Back",
    type: "custom_html",
    htmlContent: `<a href="https://couponpilot.com/wallet" target="_blank" rel="noopener" style="text-decoration:none;display:block;width:100%;height:100%">
  <div style="background:#1A1A1F;color:#FFFFFF;border-radius:4px;padding:24px 20px;height:100%;min-height:250px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;font-family:'Space Grotesk',-apple-system,sans-serif;box-sizing:border-box;width:100%">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#A1A1AA;border-bottom:1px solid #333333;padding-bottom:6px;width:100%">SPECIAL PROMO</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:38px;font-weight:800;letter-spacing:-1.5px;line-height:1;color:#FFFFFF">30% OFF</div>
      <div style="font-size:14px;font-weight:600;color:#E4E4E7;margin-top:6px">VIP Cash Back Reward</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#A1A1AA;line-height:1.4;margin-top:2px">Automatically credited to your account upon checkout completion</div>
    </div>
    <div style="background:#FFFFFF;color:#1A1A1F;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;padding:12px;border-radius:3px;width:100%;box-sizing:border-box;letter-spacing:1px;text-transform:uppercase">REDEEM NOW →</div>
  </div>
</a>`,
  },
];

async function main() {
  console.log("🖤 Seeding 3 Pure Black & White Sample Ads (Full Width/Height)...\n");

  // Remove any old sample titles
  const oldTitles = [
    "Launch Your Next Project",
    "Summer Savings Event",
    "Exclusive VPN Deal",
    "Advertise on CouponPilot",
    "Cashback Bonus Active",
    "Top Verified Stores",
    "Unlock Exclusive 20% Off",
    "Exclusive $25 Off Order",
    "Special VIP Cash Back",
  ];
  const deleted = await prisma.adCreative.deleteMany({
    where: { title: { in: oldTitles } },
  });
  if (deleted.count > 0) {
    console.log(`  🗑  Removed ${deleted.count} old sample ad(s)\n`);
  }

  for (const ad of sampleAds) {
    const slot = await prisma.adSlot.upsert({
      where: { positionSlug: ad.slotPosition },
      update: {},
      create: {
        name: ad.slotPosition.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Slot",
        positionSlug: ad.slotPosition,
      },
    });

    const creative = await prisma.adCreative.create({
      data: {
        adSlotId: slot.id,
        title: ad.title,
        type: ad.type,
        htmlContent: ad.htmlContent,
        targetUrl: "https://couponpilot.com",
        isEnabled: true,
      },
    });

    console.log(`  ✅ Created "${ad.title}" → ${ad.slotPosition} (${creative.id})`);
  }

  console.log("\n🎉 Done! Pure Black & White Ads generated successfully.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
