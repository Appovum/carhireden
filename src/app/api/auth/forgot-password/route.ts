// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Forgot Password API Route
// Route: POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      try {
        const token = createPasswordResetToken(user);
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

        // Dispatch password reset email
        const emailSent = await sendPasswordResetEmail({
          to: user.email,
          resetUrl,
        });

        console.log(`[FORGOT PASSWORD] Password reset email dispatch status for ${user.email}: ${emailSent ? "SUCCESS" : "FAILED"}`);
      } catch (err) {
        // For example APP_SECRET is not configured. Log the real cause for the
        // site owner but answer exactly as if the email had been sent, so this
        // endpoint cannot be used to find out which addresses are registered.
        console.error(`[FORGOT PASSWORD] Could not create or send the reset email for ${user.email}:`, err);
      }
    } else {
      console.log(`[FORGOT PASSWORD] User email ${normalizedEmail} not found in database.`);
    }

    // Always return success message for security to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
