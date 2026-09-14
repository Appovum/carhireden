// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Automated Hourly Demo Reset Job
// Restores pristine shipping dataset and cleans test transactions.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { seedShippingDataset } from "@/lib/importer/shippingDataset";

export async function runDemoResetJob() {
  console.log("🧹 Running automated demo reset job...");

  // Purge test interactions while preserving admin user and system settings
  await db.click.deleteMany();
  await db.conversion.deleteMany();
  await db.walletEntry.deleteMany();
  await db.withdrawal.deleteMany();
  await db.couponVote.deleteMany();
  await db.coupon.deleteMany();
  await db.storeCategory.deleteMany();
  await db.store.deleteMany();

  // Re-seed shipping dataset (50 stores x 10 coupons for fast test/demo reset)
  const result = await seedShippingDataset(50, 10);

  await db.auditLog.create({
    data: {
      userId: null,
      action: "demo_reset_executed",
      resource: "system",
      detailsJson: JSON.stringify(result),
    },
  });

  return result;
}
