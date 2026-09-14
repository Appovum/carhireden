// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Missing Cashback Claims API Route
// Route: GET/POST /api/admin/claims
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { listAllClaimsForAdmin, resolveClaimByAdmin } from "@/lib/ledger/claims";

export async function GET() {
  try {
    const claims = await listAllClaimsForAdmin();
    return NextResponse.json({ success: true, claims });
  } catch (error: any) {
    console.error("Claims GET error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch claims" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, action } = body; // action: "approve" | "reject"

    if (!claimId || !action) {
      return NextResponse.json({ success: false, error: "claimId and action required" }, { status: 400 });
    }

    const result = await resolveClaimByAdmin(claimId, action === "approve");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Claims POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to resolve claim" }, { status: 500 });
  }
}
