// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Coupons CRUD & Bulk Actions
// Route: GET/POST/PUT/DELETE /api/admin/coupons
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storeId = searchParams.get("storeId");
  const status = searchParams.get("status");

  const where: any = {};
  if (storeId) where.storeId = storeId;
  if (status) where.status = status;

  const coupons = await db.coupon.findMany({
    where,
    include: { store: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ coupons });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { storeId, title, discountText, code, type = "code", status = "active", destinationUrl, expiresAt } = body;

  if (!storeId || !title || !discountText) {
    return NextResponse.json({ error: "Missing required coupon fields." }, { status: 400 });
  }

  const dedupeInput = `manual_${storeId}_${code || title}_${Date.now()}`;
  const dedupeHash = crypto.createHash("sha256").update(dedupeInput).digest("hex");

  const coupon = await db.coupon.create({
    data: {
      storeId,
      title,
      discountText,
      code,
      type,
      status,
      destinationUrl,
      dedupeHash,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ coupon });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { ids, action, ...singleUpdates } = body;

  // Bulk action support
  if (Array.isArray(ids) && action) {
    if (action === "activate" || action === "approve") {
      await db.coupon.updateMany({
        where: { id: { in: ids } },
        data: { status: "active" },
      });
      // Activate stores for these coupons
      const coupons = await db.coupon.findMany({ where: { id: { in: ids } }, select: { storeId: true } });
      const storeIds = Array.from(new Set(coupons.map((c) => c.storeId)));
      if (storeIds.length > 0) {
        await db.store.updateMany({
          where: { id: { in: storeIds } },
          data: { isActive: true },
        });
      }
    } else if (action === "reject") {
      await db.coupon.updateMany({
        where: { id: { in: ids } },
        data: { status: "rejected" },
      });
    } else if (action === "expire") {
      await db.coupon.updateMany({
        where: { id: { in: ids } },
        data: { status: "expired" },
      });
    } else if (action === "delete") {
      await db.coupon.deleteMany({
        where: { id: { in: ids } },
      });
    }
    return NextResponse.json({ success: true, count: ids.length });
  }

  // Single update
  const { id, ...updates } = body;
  const coupon = await db.coupon.update({
    where: { id },
    data: updates,
  });

  if (updates.status === "active" && coupon.storeId) {
    await db.store.update({
      where: { id: coupon.storeId },
      data: { isActive: true },
    });
  }

  return NextResponse.json({ coupon });
}
