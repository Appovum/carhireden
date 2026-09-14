// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Automated Campaign Expiration & Lifecycle Engine
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { sendCampaignEndedEmail, sendCampaignLiveEmail } from "@/lib/email";

export async function processCampaignLifecycle() {
  const now = new Date();

  // 1. EXPIRE LIVE CAMPAIGNS WHOSE END DATE HAS PASSED
  const expiredOrders = await db.featuredOrder.findMany({
    where: {
      campaignStatus: "live",
      endsAt: { lte: now },
    },
    include: { store: true, coupon: true, adCreative: true },
  });

  let expiredCount = 0;
  for (const order of expiredOrders) {
    // Flip campaign status to completed
    await db.featuredOrder.update({
      where: { id: order.id },
      data: { campaignStatus: "completed" },
    });

    // Clear position boost flags
    if (order.storeId) {
      await db.store.update({
        where: { id: order.storeId },
        data: { isFeatured: false, featuredUntil: null },
      });
    }
    if (order.couponId) {
      await db.coupon.update({
        where: { id: order.couponId },
        data: { isFeatured: false, featuredUntil: null },
      });
    }

    // Disable banner creative artwork
    if (order.adCreativeId) {
      await db.adCreative.update({
        where: { id: order.adCreativeId },
        data: { isEnabled: false },
      });
    }

    // Send email notification
    await sendCampaignEndedEmail({
      to: order.advertiserEmail,
      brandName: order.brandName || "Advertiser",
      orderId: order.id,
    });

    expiredCount++;
  }

  // 2. ACTIVATE SCHEDULED CAMPAIGNS WHOSE START DATE HAS ARRIVED
  const scheduledOrders = await db.featuredOrder.findMany({
    where: {
      campaignStatus: "scheduled",
      paymentStatus: "paid",
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    include: { store: true, coupon: true, adCreative: true },
  });

  let activatedCount = 0;
  for (const order of scheduledOrders) {
    await db.featuredOrder.update({
      where: { id: order.id },
      data: { campaignStatus: "live" },
    });

    if (order.storeId) {
      await db.store.update({
        where: { id: order.storeId },
        data: { isFeatured: true, featuredUntil: order.endsAt },
      });
    }
    if (order.couponId) {
      await db.coupon.update({
        where: { id: order.couponId },
        data: { isFeatured: true, featuredUntil: order.endsAt },
      });
    }

    if (order.adCreativeId) {
      await db.adCreative.update({
        where: { id: order.adCreativeId },
        data: { isEnabled: true },
      });
    }

    await sendCampaignLiveEmail({
      to: order.advertiserEmail,
      brandName: order.brandName || "Advertiser",
      orderId: order.id,
    });

    activatedCount++;
  }

  return { expiredCount, activatedCount };
}
