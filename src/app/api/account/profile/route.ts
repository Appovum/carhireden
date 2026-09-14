// ═══════════════════════════════════════════════════════════════════
// CouponPilot — User Account Profile API Route
// Route: POST /api/account/profile
// Handles profile updates, encrypted payout preferences, and GDPR deletion.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/security/crypto";
import { anonymizeAndDeleteUser } from "@/lib/gdpr";
import { hashPassword } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action, userId, name, newPassword, payoutMethod, payoutDetails } = body;

  if (!userId) {
    return NextResponse.json({ success: false, message: "User ID required." }, { status: 400 });
  }

  // Action 1: GDPR Account Deletion
  if (action === "delete_account") {
    try {
      await anonymizeAndDeleteUser(userId);
      return NextResponse.json({ success: true, message: "Account deleted." });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  // Action 2: Update Profile
  const updateData: any = {};
  if (name) updateData.name = name;
  if (newPassword) updateData.passwordHash = hashPassword(newPassword);

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: updateData,
  });

  // Action 3: Save Encrypted Payout Preferences to Audit Log
  if (payoutMethod && payoutDetails) {
    const encryptedDetails = encryptSecret(payoutDetails);
    await db.auditLog.create({
      data: {
        userId,
        action: "payout_preference_updated",
        resource: "user",
        resourceId: userId,
        detailsJson: JSON.stringify({
          payoutMethod,
          payoutDetailsEncrypted: encryptedDetails,
        }),
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: "Profile settings updated successfully.",
    user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
  });
}
