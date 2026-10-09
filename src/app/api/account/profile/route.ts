// ═══════════════════════════════════════════════════════════════════
// CouponPilot — User Account Profile API Route
// Route: POST /api/account/profile
// Handles profile updates, encrypted payout preferences, and GDPR deletion.
//
// Always acts on the signed-in user. It used to take a userId from the request
// body, which let anyone change any account's password or delete any account.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/security/crypto";
import { anonymizeAndDeleteUser } from "@/lib/gdpr";
import { hashPassword } from "@/lib/auth/session";
import { requireUserApi } from "@/lib/auth/guards";
import { createSessionToken } from "@/lib/auth/sessionToken";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/sessionCookie";
import { guardDemoMode } from "@/lib/demo";

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const body = await request.json().catch(() => ({}));
  const { action, name, newPassword, payoutMethod, payoutDetails } = body;

  // The public demo's shared accounts must not be deleted or locked by visitors.
  if (action === "delete_account" || newPassword) {
    const demoBlocked = guardDemoMode();
    if (demoBlocked) return demoBlocked;
  }

  if (action === "delete_account") {
    try {
      await anonymizeAndDeleteUser(user.id);
      const res = NextResponse.json({ success: true, message: "Account deleted." });
      clearSessionCookie(res);
      return res;
    } catch (err: unknown) {
      return NextResponse.json(
        { success: false, message: err instanceof Error ? err.message : "Could not delete the account." },
        { status: 400 }
      );
    }
  }

  if (newPassword && (typeof newPassword !== "string" || newPassword.length < 6)) {
    return NextResponse.json(
      { success: false, message: "Password must be at least 6 characters long." },
      { status: 400 }
    );
  }

  const updateData: { name?: string; passwordHash?: string } = {};
  if (name && typeof name === "string") updateData.name = name;
  if (newPassword) updateData.passwordHash = hashPassword(newPassword);

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  // Store payout preferences (encrypted) in the audit log
  if (payoutMethod && payoutDetails) {
    const encryptedDetails = encryptSecret(payoutDetails);
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "payout_preference_updated",
        resource: "user",
        resourceId: user.id,
        detailsJson: JSON.stringify({
          payoutMethod,
          payoutDetailsEncrypted: encryptedDetails,
        }),
      },
    });
  }

  const res = NextResponse.json({
    success: true,
    message: "Profile settings updated successfully.",
    user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
  });

  // Changing the password ends every session issued before it. Give this
  // browser a fresh one so the person who just changed it stays signed in.
  if (newPassword) {
    const token = await createSessionToken({ id: updatedUser.id, passwordHash: updatedUser.passwordHash });
    setSessionCookie(res, token, request);
  }

  return res;
}
