// ═══════════════════════════════════════════════════════════════════
// CouponPilot — CLI Script for Catalog Seeding & Switching
// Usage: npx tsx scripts/seed-catalog.ts [--mode=showcase|live] [--coupons=10000] [--reset]
// ═══════════════════════════════════════════════════════════════════

import { runCatalogSeeder } from "../src/lib/seed/catalogSeeder";

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  let targetCoupons = 10000;

  const couponsArg = args.find((a) => a.startsWith("--coupons="));
  if (couponsArg) {
    targetCoupons = parseInt(couponsArg.split("=")[1], 10) || 10000;
  }

  console.log("🚀 Starting CLI Catalog Seeder...");
  const result = await runCatalogSeeder({ targetCoupons, reset });
  console.log(`\n🎉 Result: ${result.message}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
