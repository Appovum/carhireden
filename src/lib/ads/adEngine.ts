// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Dynamic Ad Rendering Engine
// Fetches active ad creatives by placement slot and logs impressions/clicks.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface ActiveAdCreative {
  id: string;
  slotName: string;
  title: string;
  imageUrl?: string;
  targetUrl?: string;
  htmlContent?: string;
  impressionCount: number;
  clickCount: number;
}

export async function getActiveAdForSlot(slotName: string = "in_feed"): Promise<ActiveAdCreative | null> {
  const slot = await db.adSlot.findFirst({
    where: {
      OR: [
        { positionSlug: slotName },
        { name: slotName },
      ],
      isEnabled: true,
    },
    include: {
      creatives: {
        where: { isEnabled: true },
        take: 1,
      },
    },
  });

  if (!slot || slot.creatives.length === 0) {
    return null;
  }

  const creative = slot.creatives[0];
  return {
    id: creative.id,
    slotName: slot.name,
    title: creative.title,
    imageUrl: creative.imageUrl || undefined,
    targetUrl: creative.targetUrl || undefined,
    htmlContent: creative.htmlContent || undefined,
    impressionCount: creative.impressionCount,
    clickCount: creative.clickCount,
  };
}

export async function recordAdEvent(creativeId: string, eventType: "impression" | "click") {
  if (eventType === "impression") {
    await db.adCreative.update({
      where: { id: creativeId },
      data: { impressionCount: { increment: 1 } },
    });
  } else if (eventType === "click") {
    await db.adCreative.update({
      where: { id: creativeId },
      data: { clickCount: { increment: 1 } },
    });
  }
}
