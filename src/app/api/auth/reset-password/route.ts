// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Reset Password API Route
// Route: POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPasswordResetToken } from "@/lib/auth/passwordReset";
import { hashPassword } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "Reset token is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Verify token validity
    const verification = await verifyPasswordResetToken(token);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, message: verification.error },
        { status: 400 }
      );
    }

    const { user } = verification;
    const passwordHash = hashPassword(password);

    // Update user password in database
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset! You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while resetting your password." },
      { status: 500 }
    );
  }
}
