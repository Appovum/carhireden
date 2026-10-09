// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Deal Alert Subscriptions API
// Route: POST/GET /api/account/alerts
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  // Always the signed-in user's alerts, never a user id taken from the URL.
  const userId = auth.user.id;

  const alerts = await db.alert.findMany({
    where: { userId, isEnabled: true },
    include: { store: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, alerts });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  // The signed-in user, regardless of any userId in the body.
  const userId = auth.user.id;

  try {
    const body = await request.json().catch(() => ({}));
    const { action = "subscribe", email, storeId, keyword, alertId } = body;

    // Handle Unsubscribe
    if (action === "unsubscribe") {
      if (!alertId) {
        return NextResponse.json({ success: false, message: "Alert ID required for unsubscribe." }, { status: 400 });
      }
      // You can only switch off your own alerts. Alerts created by email
      // without an account have no owner and keep working with their link.
      const existingAlert = await db.alert.findUnique({ where: { id: alertId } });
      if (!existingAlert || (existingAlert.userId && existingAlert.userId !== userId)) {
        return NextResponse.json({ success: false, message: "Alert not found." }, { status: 404 });
      }

      await db.alert.update({
        where: { id: alertId },
        data: { isEnabled: false },
      });

      try {
        await db.auditLog.create({
          data: {
            userId: userId || null,
            action: "deal_alert_unsubscribed",
            resource: "alert",
            resourceId: alertId,
            detailsJson: JSON.stringify({ alertId }),
          },
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Unsubscribed successfully." });
    }

    // Handle List
    if (action === "list") {
      const alerts = await db.alert.findMany({
        where: { userId, isEnabled: true },
        include: { store: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, alerts });
    }

    // Handle Subscribe
    if (action === "subscribe" || keyword || storeId) {
      let subscriberEmail = email;
      let currentUser = null;

      if (userId) {
        currentUser = await db.user.findUnique({ where: { id: userId } });
        if (currentUser && !subscriberEmail) {
          subscriberEmail = currentUser.email;
        }
      }

      if (!subscriberEmail) {
        subscriberEmail = "shopper@couponpilot.com";
      }

      let targetStoreId = storeId;
      // If a keyword was provided without explicit storeId, attempt to match store by name or keyword
      if (!targetStoreId && keyword) {
        const matchedStore = await db.store.findFirst({
          where: {
            OR: [
              { name: { contains: keyword } },
              { slug: { contains: keyword.toLowerCase() } },
              { domain: { contains: keyword.toLowerCase() } },
            ],
          },
        });
        if (matchedStore) {
          targetStoreId = matchedStore.id;
        }
      }

      // Fallback store if no match found
      if (!targetStoreId) {
        const firstStore = await db.store.findFirst();
        if (firstStore) {
          targetStoreId = firstStore.id;
        }
      }

      if (!targetStoreId) {
        return NextResponse.json({ success: false, message: "No active stores available for alerts." }, { status: 400 });
      }

      const alert = await db.alert.create({
        data: {
          userId: userId || null,
          email: subscriberEmail,
          storeId: targetStoreId,
          targetDiscount: keyword || "General Deals",
          isEnabled: true,
        },
        include: { store: true },
      });

      try {
        await db.auditLog.create({
          data: {
            userId: userId || null,
            action: "deal_alert_subscribed",
            resource: "alert",
            resourceId: alert.id,
            detailsJson: JSON.stringify({
              alertId: alert.id,
              keyword: keyword || "General Deals",
              storeName: alert.store?.name,
              email: subscriberEmail,
            }),
          },
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Deal alert for "${keyword || alert.store.name}" saved! We will notify ${subscriberEmail} when new deals are posted.`,
        alert,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to process alert request." }, { status: 500 });
  }
}
