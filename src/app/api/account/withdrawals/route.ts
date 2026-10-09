// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Shopper API: request a withdrawal
// Route: POST /api/account/withdrawals
//
// Admins review and pay requests through /api/admin/withdrawals.
//
// This used to live inside the admin route, took the user id from the request
// body, and when nobody was identified it fell back to the first user in the
// database. The requester is now always the signed-in user.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth/guards";
import { guardDemoMode } from "@/lib/demo";
import { getUserWalletBalance } from "@/lib/ledger/balance";

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  // Withdrawals were blocked on the public demo before, via the admin API guard.
  const demoBlocked = guardDemoMode();
  if (demoBlocked) return demoBlocked;

  try {
    const body = await request.json().catch(() => ({}));
    const { amountMinor, payoutChannel, payoutMethod, payoutTarget, payoutDetailsEncrypted } = body;

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid withdrawal amount." },
        { status: 400 }
      );
    }

    const balance = await getUserWalletBalance(user.id);
    if (amountMinor > balance.confirmedMinor) {
      return NextResponse.json(
        { success: false, message: "The amount is more than your confirmed balance." },
        { status: 400 }
      );
    }

    // One pending request at a time
    const existingRequested = await db.withdrawal.findFirst({
      where: { userId: user.id, status: "requested" },
    });
    if (existingRequested) {
      return NextResponse.json(
        {
          success: false,
          message: "A withdrawal request is already pending review for your account.",
          withdrawal: existingRequested,
        },
        { status: 400 }
      );
    }

    const target = String(payoutTarget || payoutDetailsEncrypted || user.email);
    const method = String(payoutChannel || payoutMethod || "PAYPAL");

    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amountMinor,
        currency: "USD",
        payoutMethod: method,
        payoutDetailsEncrypted: target,
        status: "requested",
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "withdrawal_requested",
          resource: "withdrawal",
          resourceId: withdrawal.id,
          detailsJson: JSON.stringify({ amountMinor, payoutMethod: method, payoutTarget: target }),
        },
      });
    } catch {
      // the audit trail must never block the request itself
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully!",
      withdrawal,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to process withdrawal." },
      { status: 500 }
    );
  }
}
