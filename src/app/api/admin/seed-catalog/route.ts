// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Seed Catalog & Switcher Route
// POST /api/admin/seed-catalog
// Non-destructive catalog seeder for Admin UI triggering.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { runCatalogSeeder } from "@/lib/seed/catalogSeeder";
import { guardDemoMode } from "@/lib/demo";

export async function POST(req: Request) {
  // Check Demo Mode
  const demoGuard = guardDemoMode();
  if (demoGuard) return demoGuard;

  try {
    const body = await req.json().catch(() => ({}));
    const targetCoupons = typeof body.coupons === "number" ? body.coupons : 10000;
    const reset = Boolean(body.reset);

    const result = await runCatalogSeeder({ targetCoupons, reset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to execute catalog seeder:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Catalog seeding failed" },
      { status: 500 }
    );
  }
}
