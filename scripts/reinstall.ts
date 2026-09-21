// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Reinstall bootstrap (admin + settings + ad slots + catalog)
// Run via scripts/reinstall-database.sh after the schema has been reset.
// Mirrors what POST /api/install does, without exposing the public installer.
// ═══════════════════════════════════════════════════════════════════

import { db } from "../src/lib/db";
import { registerUser } from "../src/lib/auth/session";
import { runCatalogSeeder } from "../src/lib/seed/catalogSeeder";

async function main() {
  // Defaults match the public demo credentials published on the CodeCanyon listing.
  const adminEmail = process.env.ADMIN_EMAIL || "admin@couponpilot.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "password123";

  const existing = await db.user.count({ where: { role: "admin" } });
  if (existing > 0) {
    throw new Error("An admin user already exists — refusing to reinstall over live data.");
  }

  console.log("→ Creating admin account");
  await registerUser({ email: adminEmail, password: adminPassword, name: "Admin", role: "admin" });

  console.log("→ Creating demo shopper account (demo@example.com / password123)");
  await registerUser({ email: "demo@example.com", password: "password123", name: "Demo User", role: "user" });

  console.log("→ Writing core settings");
  const settings: Array<[string, unknown, string]> = [
    ["site_name", "CouponPilot", "general"],
    ["default_currency", "USD", "general"],
    ["app_installed", true, "general"],
  ];
  for (const [key, value, category] of settings) {
    await db.setting.upsert({
      where: { key },
      update: { valueJson: JSON.stringify(value) },
      create: { key, valueJson: JSON.stringify(value), category },
    });
  }

  console.log("→ Creating default ad slots");
  for (const positionSlug of ["header_top", "sidebar_right", "footer_bottom"]) {
    await db.adSlot.upsert({
      where: { positionSlug },
      update: {},
      create: {
        name: positionSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Slot",
        positionSlug,
      },
    });
  }

  console.log("→ Seeding catalog (200 stores / 10,000 coupons) — this takes a few minutes");
  const result = await runCatalogSeeder({ targetCoupons: 10000 });
  console.log("   ", JSON.stringify(result));

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Admin login:    ", adminEmail);
  console.log("  Admin password: ", adminPassword);
  console.log("  Demo user:       demo@example.com / password123");
  console.log("══════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("Reinstall failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
