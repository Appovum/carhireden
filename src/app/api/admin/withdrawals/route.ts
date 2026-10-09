// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Withdrawal Management
// Route: GET/POST /api/admin/withdrawals
// Shoppers request withdrawals through POST /api/account/withdrawals.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { approveAndPayWithdrawal } from "@/lib/ledger/withdrawals";
import { requireAdminApi } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const whereClause: Prisma.WithdrawalWhereInput = {};
  if (status && status !== "all") {
    whereClause.status = status as Prisma.WithdrawalWhereInput["status"];
  }

  const withdrawals = await db.withdrawal.findMany({
    where: whereClause,
    // the page needs the email only; never send the whole user row (it has the password hash)
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const { action, withdrawalId } = body;

    // Admin action: approve / mark paid
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

    // Shoppers no longer request withdrawals here; see /api/account/withdrawals.
    return NextResponse.json(
      { success: false, message: "Unsupported action. Shoppers request withdrawals at /api/account/withdrawals." },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to process withdrawal." },
      { status: 500 }
    );
  }
}
