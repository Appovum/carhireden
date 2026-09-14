// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Standalone Seed Script for 10,000+ Coupon Dataset
// ═══════════════════════════════════════════════════════════════════

import { seedShippingDataset } from "../src/lib/importer/shippingDataset";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await seedShippingDataset(500, 20);
}

main()
  .catch((e) => {
    console.error("Shipping dataset seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
