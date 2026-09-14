// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public Data-Driven Categories API
// Route: /api/categories
// Returns only categories that actually have active merchant offers in DB
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        _count: {
          select: { stores: true },
        },
      },
    });

    function cleanName(n: string) {
      return n
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cleanName(cat.name),
      slug: cat.slug,
      icon: cat.icon || "tag",
      offerCount: cat._count?.stores || 0,
    }));

    return NextResponse.json(
      { success: true, categories: formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Public Categories GET error:", error);
    return NextResponse.json({ success: false, categories: [] });
  }
}
