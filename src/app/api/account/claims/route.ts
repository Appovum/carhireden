// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Missing Cashback Claims Queue API
// Route: POST /api/account/claims
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { submitMissingCashbackClaim, getUserMissingCashbackClaims } from "@/lib/ledger/claims";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action, userId, storeId, clickId, orderId, orderNumber, purchaseAmountMinor, currency = "USD" } = body;

  if (!userId) {
    return NextResponse.json({ success: false, message: "User ID required." }, { status: 400 });
  }

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
