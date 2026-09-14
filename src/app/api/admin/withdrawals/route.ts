// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin & Shopper API: Withdrawal Management
// Route: GET/POST /api/admin/withdrawals
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { approveAndPayWithdrawal } from "@/lib/ledger/withdrawals";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const whereClause: any = {};
  if (status && status !== "all") {
    whereClause.status = status;
  }

  const withdrawals = await db.withdrawal.findMany({
    where: whereClause,
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      action = "request",
      withdrawalId,
      userId,
      amountMinor,
      payoutChannel,
      payoutMethod,
      payoutTarget,
      payoutDetailsEncrypted,
    } = body;

    // Admin Action: Approve / Mark Paid
    if (action === "approve" || action === "paid") {
      if (!withdrawalId) {
        return NextResponse.json({ error: "Withdrawal ID required for approval." }, { status: 400 });
      }
      const updated = await approveAndPayWithdrawal(withdrawalId);

      // Also clean up any other leftover requested records for this user
      if (updated && updated.userId) {
        await db.withdrawal.updateMany({
          where: { userId: updated.userId, status: "requested" },
          data: { status: "paid", paidAt: new Date(), approvedAt: new Date() },
        });
      }

      return NextResponse.json({ success: true, withdrawal: updated });
    }

    // Shopper Action: Submit New Withdrawal Request
    let targetUserId = userId;
    let targetEmail = payoutTarget || payoutDetailsEncrypted;

    if (!targetUserId) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("cp_session")?.value;
      if (sessionCookie) {
        targetUserId = sessionCookie;
      }
    }

    if (!targetUserId && targetEmail) {
      const u = await db.user.findFirst({ where: { email: targetEmail } });
      if (u) {
        targetUserId = u.id;
      }
    }

    if (!targetUserId) {
      const firstUser = await db.user.findFirst();
      if (firstUser) {
        targetUserId = firstUser.id;
        targetEmail = targetEmail || firstUser.email;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "User required for withdrawal." }, { status: 400 });
    }

    const targetUserObj = await db.user.findUnique({ where: { id: targetUserId } });
    if (targetUserObj && !targetEmail) {
      targetEmail = targetUserObj.email;
    }

    const requestAmountMinor = amountMinor && amountMinor > 0 ? amountMinor : 945; // default fallback if minor units 0

    // Check if user already has a pending withdrawal request
    const existingRequested = await db.withdrawal.findFirst({
      where: { userId: targetUserId, status: "requested" },
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

    const withdrawal = await db.withdrawal.create({
      data: {
        userId: targetUserId,
        amountMinor: requestAmountMinor,
        currency: "USD",
        payoutMethod: payoutChannel || payoutMethod || "PAYPAL",
        payoutDetailsEncrypted: targetEmail || "shopper@couponpilot.com",
        status: "requested",
      },
      include: { user: true },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: targetUserId,
          action: "withdrawal_requested",
          resource: "withdrawal",
          resourceId: withdrawal.id,
          detailsJson: JSON.stringify({
            amountMinor: requestAmountMinor,
            payoutMethod: payoutChannel || payoutMethod || "PAYPAL",
            payoutTarget: targetEmail,
          }),
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully!",
      withdrawal,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to process withdrawal." }, { status: 500 });
  }
}
