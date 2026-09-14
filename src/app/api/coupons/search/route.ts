// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Coupon Autocomplete Search API Route
// Route: GET /api/coupons/search?q=...
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";

  try {
    const coupons = await db.coupon.findMany({
      where: query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { store: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {},
      take: 20,
      include: {
        store: { select: { name: true, logoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = coupons.map((c) => ({
      id: c.id,
      title: c.title,
      code: c.code,
      discountText: c.discountText,
      storeName: c.store.name,
      storeLogo: c.store.logoUrl,
    }));

    return NextResponse.json({ success: true, coupons: formatted });
  } catch (error: any) {
    console.error("Coupon search error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
