// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Real-Time Ad Impression & Click Tracker API
// Route: POST /api/ads/track
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ads/adEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creativeId, event } = body;

    if (!creativeId || (event !== "impression" && event !== "click")) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    await recordAdEvent(creativeId, event);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Ad tracking error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
