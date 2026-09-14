// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Demo Reset API Route
// Route: POST /api/admin/demo-reset
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { runDemoResetJob } from "@/lib/jobs/demoReset";

export async function POST(request: NextRequest) {
  try {
    const result = await runDemoResetJob();
    return NextResponse.json({
      success: true,
      message: "Demo database reset completed successfully!",
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
