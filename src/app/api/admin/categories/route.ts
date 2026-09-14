// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Categories API Route
// Route: /api/admin/categories
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        stores: true,
      },
      orderBy: { name: "asc" },
    });

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || "tag",
      description: cat.description,
      storeCount: cat.stores.length,
      createdAt: cat.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, categories: formatted });
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, icon, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        icon: icon || "tag",
        description,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    await db.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Categories DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 });
  }
}
