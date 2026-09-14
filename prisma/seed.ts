// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Prisma Database Seed Script
// Populates initial networks, stores, categories, and settings.
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { runCatalogSeeder } from "../src/lib/seed/catalogSeeder";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CouponPilot database with 200 Merchant Brands and 10,000 Coupons...");
  await runCatalogSeeder({ targetCoupons: 10000 });
  console.log("✅ Database seeding completed cleanly!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
