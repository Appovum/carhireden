// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth Logout Route
// Route: POST /api/auth/logout
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/sessionCookie";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully." });
  clearSessionCookie(res);
  return res;
}
