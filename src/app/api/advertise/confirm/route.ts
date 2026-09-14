// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Advertiser Order Status Inspection API Route
// Route: GET /api/advertise/confirm?orderId=...
// Returns current database order status WITHOUT modifying payment or campaign state.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
  }

  try {
    const order = await db.featuredOrder.findUnique({
      where: { id: orderId },
      include: { store: true, coupon: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        placementKind: order.placementKind,
        paymentStatus: order.paymentStatus,
        campaignStatus: order.campaignStatus,
        advertiserEmail: order.advertiserEmail,
        brandName: order.brandName || order.store?.name || "Merchant Brand",
        magicToken: order.magicToken,
        planType: order.planType,
        priceMinor: order.priceMinor,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Order inspect error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
