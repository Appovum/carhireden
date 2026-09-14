// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Banner Ads Library & Google AdSense API Route
// Route: GET/POST /api/admin/ads
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const creatives = await db.adCreative.findMany({
      include: { adSlot: true, featuredOrders: true },
      orderBy: { createdAt: "desc" },
    });

    // Compute dynamic active counts for each slot position
    const headerTopActive = creatives.filter(
      (c) => c.adSlot?.positionSlug === "header_top" && c.isEnabled
    ).length;
    const storeSidebarActive = creatives.filter(
      (c) => c.adSlot?.positionSlug === "store_sidebar" && c.isEnabled
    ).length;
    const inFeedActive = creatives.filter(
      (c) => c.adSlot?.positionSlug === "in_feed" && c.isEnabled
    ).length;

    const formatted = creatives.map((c) => {
      const ctr = c.impressionCount > 0 ? (c.clickCount / c.impressionCount) * 100 : 0;
      const linkedOrder = c.featuredOrders?.[0];

      return {
        id: c.id,
        name: c.title,
        type: c.type || (c.htmlContent ? "adsense" : "image"),
        slotPosition: c.adSlot ? c.adSlot.positionSlug : "header_top",
        imageUrl: c.imageUrl,
        targetUrl: c.targetUrl || "#",
        htmlContent: c.htmlContent,
        impressions: c.impressionCount,
        clicks: c.clickCount,
        ctrPct: ctr,
        isEnabled: c.isEnabled,
        orderId: linkedOrder?.id || null,
        campaignStatus: linkedOrder?.campaignStatus || (c.isEnabled ? "live" : "pending_review"),
        advertiserEmail: linkedOrder?.advertiserEmail || null,
      };
    });

    return NextResponse.json({
      success: true,
      creatives: formatted,
      slotCounts: {
        header_top: headerTopActive,
        store_sidebar: storeSidebarActive,
        in_feed: inFeedActive,
      },
    });
  } catch (error: any) {
    console.error("Ads GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      creativeId,
      title,
      type = "image",
      imageUrl,
      targetUrl,
      htmlContent,
      slotPosition = "header_top",
      isEnabled = true,
    } = body;

    // Support toggle/approve action
    if (action === "toggle" && creativeId) {
      const creative = await db.adCreative.findUnique({ where: { id: creativeId } });
      if (!creative) {
        return NextResponse.json({ success: false, error: "Creative not found" }, { status: 404 });
      }

      const updated = await db.adCreative.update({
        where: { id: creativeId },
        data: { isEnabled: !creative.isEnabled },
      });

      // Update associated featured order campaignStatus if linked
      await db.featuredOrder.updateMany({
        where: { adCreativeId: creativeId },
        data: { campaignStatus: updated.isEnabled ? "live" : "completed" },
      });

      return NextResponse.json({ success: true, creative: updated });
    }

    let slot = await db.adSlot.findUnique({ where: { positionSlug: slotPosition } });
    if (!slot) {
      slot = await db.adSlot.create({
        data: { name: `${slotPosition} Slot`, positionSlug: slotPosition },
      });
    }

    const created = await db.adCreative.create({
      data: {
        adSlotId: slot.id,
        title: title || "AdSense Creative",
        type,
        imageUrl: imageUrl || null,
        targetUrl: targetUrl || "https://couponpilot.com",
        htmlContent: htmlContent || null,
        isEnabled,
      },
    });

    return NextResponse.json({ success: true, creative: created });
  } catch (error: any) {
    console.error("Ads POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
