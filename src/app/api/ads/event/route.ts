// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Ad Event Logger API
// Route: POST /api/ads/event
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ads/adEngine";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { creativeId, eventType } = body;

  if (!creativeId || (eventType !== "impression" && eventType !== "click")) {
    return NextResponse.json({ error: "Invalid ad event parameters." }, { status: 400 });
  }

  await recordAdEvent(creativeId, eventType);

  return NextResponse.json({ success: true, creativeId, eventType });
}
