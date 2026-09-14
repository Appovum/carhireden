// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth Session State Route
// Route: GET /api/auth/me
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserWalletBalance } from "@/lib/ledger/balance";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("cp_session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ loggedIn: false });
  }

  const user = await db.user.findUnique({
    where: { id: sessionCookie },
    select: { id: true, email: true, name: true, role: true, referralCode: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ loggedIn: false });
  }

  const balanceObj = await getUserWalletBalance(user.id);
  const balance = balanceObj.confirmedMinor / 100; // convert to dollars

  return NextResponse.json({
    loggedIn: true,
    user,
    balance,
  });
}
