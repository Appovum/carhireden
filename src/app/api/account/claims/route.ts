// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Missing Cashback Claims Queue API
// Route: POST /api/account/claims
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { submitMissingCashbackClaim, getUserMissingCashbackClaims } from "@/lib/ledger/claims";
import { requireUserApi } from "@/lib/auth/guards";

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  // Claims are always filed for, and listed for, the signed-in user.
  const userId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const { action, storeId, clickId, orderId, orderNumber, purchaseAmountMinor, currency = "USD" } = body;

  if (action === "list") {
    const claims = await getUserMissingCashbackClaims(userId);
    return NextResponse.json({ success: true, claims });
  }

  const finalOrderId = orderId || orderNumber;
  if (!storeId || !finalOrderId || !purchaseAmountMinor) {
    return NextResponse.json({ success: false, message: "Store, order number, and purchase amount are required." }, { status: 400 });
  }

  try {
    const claim = await submitMissingCashbackClaim({
      userId,
      storeId,
      clickId,
      orderId: finalOrderId,
      orderNumber: finalOrderId,
      purchaseAmountMinor,
      currency,
    });

    return NextResponse.json({
      success: true,
      message: "Missing cashback claim submitted successfully. Our team will review it within 48 hours.",
      claim,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
