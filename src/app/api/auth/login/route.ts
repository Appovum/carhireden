// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth Login API Route
// Route: POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { loginUser } from "@/lib/auth/session";
import { createSessionToken } from "@/lib/auth/sessionToken";
import { setSessionCookie } from "@/lib/auth/sessionCookie";

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

  let user;
  try {
    user = await loginUser(email, password, guestIpHash);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Invalid credentials." },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = await createSessionToken({ id: user.id, passwordHash: user.passwordHash });
  } catch (err) {
    // APP_SECRET is not configured. Tell the owner in the log, not the visitor.
    console.error("[AUTH] Could not create a session:", err);
    return NextResponse.json(
      { success: false, message: "Sign-in is temporarily unavailable. Please contact the site owner." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({
    success: true,
    message: "Login successful!",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  setSessionCookie(res, token, request);
  return res;
}
