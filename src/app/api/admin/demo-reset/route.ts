// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Demo Reset API Route
// Route: POST /api/admin/demo-reset
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { runDemoResetJob } from "@/lib/jobs/demoReset";
import { requireAdminApi } from "@/lib/auth/guards";
import { isDemoMode } from "@/lib/demo";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // This deletes every store, coupon, click, conversion, wallet entry and
  // withdrawal and reloads sample data. It exists for the public live demo and
  // must never run on a real site, so it refuses unless demo mode is on.
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        success: false,
        error: "Demo reset is disabled. It is only available when NEXT_PUBLIC_DEMO_MODE is true.",
      },
      { status: 403 }
    );
  }

  try {
    const result = await runDemoResetJob();
    return NextResponse.json({
      success: true,
      message: "Demo database reset completed successfully!",
      result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Demo reset failed." },
      { status: 500 }
    );
  }
}
