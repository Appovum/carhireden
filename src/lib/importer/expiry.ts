// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Hourly Auto-Expiry Job
// Transition coupons with past expiresAt to status 'expired' while retaining rows.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export async function expireOutdatedCoupons(): Promise<{ expiredCount: number }> {
  const now = new Date();

  const result = await db.coupon.updateMany({
    where: {
      expiresAt: {
        lt: now,
      },
      status: {
        not: "expired",
      },
    },
    data: {
      status: "expired",
    },
  });

  return { expiredCount: result.count };
}
