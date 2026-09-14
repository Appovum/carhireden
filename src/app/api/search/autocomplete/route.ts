// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Autocomplete Search API Route
// Route: GET /api/search/autocomplete?q=...
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { autocompleteSearch } from "@/lib/search/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const results = await autocompleteSearch(q);

  return NextResponse.json({ results }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
