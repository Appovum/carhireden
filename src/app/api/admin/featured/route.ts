// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Featured Placements (Boost Queue) API Route
// Route: GET/POST /api/admin/featured
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCampaignApprovedEmail, sendCampaignLiveEmail } from "@/lib/email";

export async function GET() {
  try {
    const orders = await db.featuredOrder.findMany({
      where: {
        NOT: { placementKind: "banner" },
      },
      include: { store: true, coupon: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((o) => {
      const now = new Date();
      const isLiveTime = o.startsAt <= now && o.endsAt > now;

      return {
        id: o.id,
        storeId: o.storeId,
        storeSlug: o.store ? o.store.slug : null,
        storeName: o.brandName || (o.store ? o.store.name : "Featured Merchant"),
        couponId: o.couponId,
        couponTitle: o.coupon ? o.coupon.title : null,
        planType: o.planType === "featured_store" ? "Featured Store Placement" : o.planType === "featured_coupon" ? "Top Offer Spot" : o.planType,
        durationDays: Math.max(1, Math.round((o.endsAt.getTime() - o.startsAt.getTime()) / (1000 * 60 * 60 * 24))),
        priceMinor: o.priceMinor,
        paymentStatus: o.paymentStatus || "pending",
        campaignStatus: o.campaignStatus || "pending_review",
        isLiveTime,
        startsAt: o.startsAt.toISOString(),
        endsAt: o.endsAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error: any) {
    console.error("Featured GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, action } = body;

    if (!orderId || !["approve", "reject", "end_early"].includes(action)) {
      return NextResponse.json({ success: false, error: "Valid orderId and action (approve/reject/end_early) required" }, { status: 400 });
    }

    const order = await db.featuredOrder.findUnique({
      where: { id: orderId },
      include: { store: true, coupon: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const now = new Date();

    if (action === "approve") {
      const startsAt = now;
      const endsAt = new Date(now.getTime() + (order.durationDays || 7) * 24 * 60 * 60 * 1000);
      const targetCampaignStatus = "live";

      // Update FeaturedOrder with start/end date starting from approval time and mark payment as paid
      const updated = await db.featuredOrder.update({
        where: { id: orderId },
        data: {
          campaignStatus: targetCampaignStatus,
          paymentStatus: "paid",
          startsAt,
          endsAt,
        },
      });

      // Activate featured flags on Store or Coupon until computed endsAt
      if (order.storeId) {
        await db.store.update({
          where: { id: order.storeId },
          data: { isFeatured: true, featuredUntil: endsAt },
        });
      }
      if (order.couponId) {
        await db.coupon.update({
          where: { id: order.couponId },
          data: { isFeatured: true, featuredUntil: endsAt },
        });
      }

      await sendCampaignApprovedEmail({
        to: order.advertiserEmail,
        brandName: order.brandName || "Advertiser",
        orderId: order.id,
        startsAt: order.startsAt.toISOString().slice(0, 10),
        endsAt: order.endsAt.toISOString().slice(0, 10),
      });

      if (targetCampaignStatus === "live") {
        await sendCampaignLiveEmail({
          to: order.advertiserEmail,
          brandName: order.brandName || "Advertiser",
          orderId: order.id,
        });
      }

      return NextResponse.json({ success: true, order: updated });
    }

    if (action === "reject") {
      const updated = await db.featuredOrder.update({
        where: { id: orderId },
        data: { campaignStatus: "rejected" },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    if (action === "end_early") {
      const updated = await db.featuredOrder.update({
        where: { id: orderId },
        data: { campaignStatus: "completed" },
      });

      if (order.storeId) {
        await db.store.update({ where: { id: order.storeId }, data: { isFeatured: false, featuredUntil: null } });
      }
      if (order.couponId) {
        await db.coupon.update({ where: { id: order.couponId }, data: { isFeatured: false, featuredUntil: null } });
      }

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Featured POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
