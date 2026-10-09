// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth Session State Route
// Route: GET /api/auth/me
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/currentUser";
import { getUserWalletBalance } from "@/lib/ledger/balance";

export async function GET() {
  const user = await getSessionUser();

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
