// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Stores CRUD & Review Queue
// Route: GET/POST/PUT/DELETE /api/admin/stores
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status"); // "active" | "pending_review"

  const where: any = {};
  if (status === "pending_review") {
    where.isActive = false;
  } else if (status === "active") {
    where.isActive = true;
  }

  const stores = await db.store.findMany({
    where,
    include: {
      categories: { include: { category: true } },
      _count: { select: { coupons: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedStores = stores.map((s) => ({
    ...s,
    totalCoupons: s._count.coupons,
  }));

  return NextResponse.json({ stores: formattedStores });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    slug,
    domain,
    logoUrl,
    rawDestinationUrl,
    affiliateNetworkId,
    merchantId,
    defaultCashbackRate,
    isFeatured = false,
    isActive = true,
  } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: "Store name and domain are required." }, { status: 400 });
  }

  const derivedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const defaultLogo = logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const destUrl = rawDestinationUrl || (domain.startsWith("http") ? domain : `https://${domain}`);

  const store = await db.store.create({
    data: {
      name,
      slug: derivedSlug,
      domain,
      logoUrl: defaultLogo,
      rawDestinationUrl: destUrl,
      affiliateNetworkId: affiliateNetworkId || null,
      merchantId: merchantId || null,
      defaultCashbackRate: defaultCashbackRate || "5.0%",
      isFeatured,
      isActive,
    },
  });

  return NextResponse.json({ store });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ids, action, ...updates } = body;

  // Bulk action support
  if (Array.isArray(ids) && action) {
    if (action === "publish" || action === "activate") {
      await db.store.updateMany({
        where: { id: { in: ids } },
        data: { isActive: true },
      });
    } else if (action === "deactivate") {
      await db.store.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
    } else if (action === "delete") {
      await db.store.deleteMany({
        where: { id: { in: ids } },
      });
    }
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (!id) {
    return NextResponse.json({ error: "Missing store id." }, { status: 400 });
  }

  const store = await db.store.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ store });
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Store ID required." }, { status: 400 });
  }

  await db.store.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
