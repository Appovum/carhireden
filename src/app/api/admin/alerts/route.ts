// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Deal Alerts Management API
// Route: GET/POST/DELETE /api/admin/alerts
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const alerts = await db.alert.findMany({
      include: {
        store: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = alerts.map((a) => ({
      id: a.id,
      email: a.email || a.user?.email || "anonymous@couponpilot.com",
      userName: a.user?.name || "Shopper",
      storeName: a.store?.name || "All Stores",
      keyword: a.targetDiscount || "All Deals",
      isEnabled: a.isEnabled,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, alerts: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch alerts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId) {
      return NextResponse.json({ success: false, error: "Alert ID required." }, { status: 400 });
    }

    if (action === "delete") {
      await db.alert.delete({ where: { id: alertId } });
      return NextResponse.json({ success: true, message: "Alert deleted." });
    }

    if (action === "toggle") {
      const existing = await db.alert.findUnique({ where: { id: alertId } });
      if (existing) {
        await db.alert.update({
          where: { id: alertId },
          data: { isEnabled: !existing.isEnabled },
        });
      }
      return NextResponse.json({ success: true, message: "Alert status updated." });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Action failed." }, { status: 500 });
  }
}
