// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Ad Transactions & Revenue API Route
// Route: GET /api/admin/ads/transactions
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PLACEMENT_PLANS } from "@/app/api/advertise/config/route";

export async function GET() {
  try {
    const orders = await db.featuredOrder.findMany({
      include: { store: true, coupon: true },
      orderBy: { createdAt: "desc" },
    });

    let totalAdRevenueMinor = 0;
    let completedCount = 0;
    let pendingCount = 0;

    const formattedTransactions = orders.map((o) => {
      const isPaid = o.paymentStatus === "paid";
      if (isPaid) {
        totalAdRevenueMinor += o.priceMinor;
        completedCount++;
      } else {
        pendingCount++;
      }

      const isPaypal = (o as any).paymentGateway === "paypal" || o.currency === "USD_PAYPAL";
      const paymentMethod = isPaypal ? "PayPal Express" : "Stripe (Card / Apple Pay)";

      // Human-readable plan name
      const matchedPlan = PLACEMENT_PLANS.find((p) => p.id === o.planType);
      const planName = matchedPlan ? matchedPlan.name : o.planType.replace(/_/g, " ");

      // Real store or brand name
      const storeName = o.brandName || (o.store ? o.store.name : "Featured Advertiser");

      return {
        id: o.id,
        transactionId: o.id,
        orderId: o.id,
        storeName,
        advertiserEmail: o.advertiserEmail,
        placementKind: o.placementKind || "boost",
        planType: planName,
        rawPlanType: o.planType,
        durationDays: Math.max(1, Math.round((o.endsAt.getTime() - o.startsAt.getTime()) / (1000 * 60 * 60 * 24))),
        priceMinor: o.priceMinor,
        paymentMethod,
        paymentStatus: o.paymentStatus || "pending",
        campaignStatus: o.campaignStatus || "pending_review",
        createdAt: o.createdAt.toISOString(),
      };
    });

    const totals = {
      totalAdRevenueMinor,
      totalOrdersCount: orders.length,
      completedCount,
      pendingCount,
    };

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      totals,
      summary: totals,
    });
  } catch (error: any) {
    console.error("Admin transactions GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, paymentStatus } = body;

    if (!orderId || !["paid", "pending", "failed"].includes(paymentStatus)) {
      return NextResponse.json({ success: false, error: "orderId and valid paymentStatus required" }, { status: 400 });
    }

    const updated = await db.featuredOrder.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error("Admin transactions POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
