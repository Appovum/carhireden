// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth Login API Route
// Route: POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { loginUser } from "@/lib/auth/session";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const guestIpHash = hashIp(clientIp);

  try {
    const user = await loginUser(email, password, guestIpHash);

    const res = NextResponse.json({
      success: true,
      message: "Login successful!",
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    res.cookies.set("cp_session", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Invalid credentials." }, { status: 401 });
  }
}
