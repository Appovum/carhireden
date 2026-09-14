// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Store Autocomplete Search API Route
// Route: GET /api/stores/search?q=...
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";

  try {
    const stores = await db.store.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
              { domain: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        logoUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, stores });
  } catch (error: any) {
    console.error("Store search error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
