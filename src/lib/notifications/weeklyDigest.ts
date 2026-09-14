// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Weekly Digest Email Generator
// Formats top deals of the week into HTML email newsletter format.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { defaultEmailAdapter } from "./emailAdapter";

export async function sendWeeklyDigestToSubscribers(): Promise<{ totalSent: number }> {
  const [subscribers, topCoupons] = await Promise.all([
    db.subscriber.findMany({ where: { isVerified: true } }),
    db.coupon.findMany({
      where: { status: "active" },
      include: { store: true },
      take: 5,
      orderBy: { usedCount: "desc" },
    }),
  ]);

  if (subscribers.length === 0 || topCoupons.length === 0) {
    return { totalSent: 0 };
  }

  const itemsHtml = topCoupons
    .map(
      (c) =>
        `<li style="margin-bottom:12px;"><strong>${c.store.name}</strong>: ${c.title} (<em>${c.discountText}</em>)</li>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif; padding:20px; color:#333;">
      <h2>🔥 Top Deals of the Week on CouponPilot</h2>
      <ul>${itemsHtml}</ul>
    </div>
  `;

  let totalSent = 0;
  for (const sub of subscribers) {
    await defaultEmailAdapter.sendEmail({
      to: sub.email,
      subject: "🔥 Top Deals of the Week — CouponPilot Digest",
      html,
    });
    totalSent++;
  }

  return { totalSent };
}
