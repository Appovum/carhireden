// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Campaign Expiry CRON API Route (Authenticated)
// Route: GET/POST /api/cron/campaign-expiry
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { processCampaignLifecycle } from "@/lib/cron/expiry";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[SECURITY ALERT] CRON_SECRET environment variable is not configured.");
    return NextResponse.json(
      { success: false, error: "Server Configuration Error: CRON_SECRET environment variable is not configured." },
      { status: 500 }
    );
  }

  const authHeader = request?.headers?.get("authorization");

  let paramSecret: string | null = null;
  try {
    const url = new URL(request.url);
    paramSecret = url.searchParams.get("secret");
  } catch {}

  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") || paramSecret;

  if (!providedSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid CRON authorization secret." },
      { status: 401 }
    );
  }

  try {
    const result = await processCampaignLifecycle();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Cron campaign expiry error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
