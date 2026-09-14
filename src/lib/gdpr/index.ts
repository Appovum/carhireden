// ═══════════════════════════════════════════════════════════════════
// CouponPilot — GDPR Data Export & Erasure Manager
// Export full user JSON archive and anonymize user personal data.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      clicks: { take: 500 },
      walletEntries: { orderBy: { createdAt: "desc" } },
      withdrawals: true,
      votes: true,
      alerts: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return {
    exportDate: new Date().toISOString(),
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    clicks: user.clicks.map((c) => ({
      id: c.id,
      storeId: c.storeId,
      createdAt: c.createdAt,
    })),
    walletEntries: user.walletEntries.map((w) => ({
      id: w.id,
      type: w.type,
      bucket: w.bucket,
      amountMinor: w.amountMinor,
      currency: w.currency,
      description: w.description,
      createdAt: w.createdAt,
    })),
    withdrawals: user.withdrawals.map((w) => ({
      id: w.id,
      amountMinor: w.amountMinor,
      payoutMethod: w.payoutMethod,
      status: w.status,
      createdAt: w.createdAt,
    })),
  };
}

export async function anonymizeAndDeleteUser(userId: string) {
  const anonymizedEmail = `anonymized_${userId}_${Date.now()}@gdpr.deleted`;

  // 1. Anonymize user profile details
  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail,
      name: "Anonymized User",
      passwordHash: null,
      googleId: null,
      avatarUrl: null,
    },
  });

  // 2. Anonymize user IP address hashes in click logs
  await db.click.updateMany({
    where: { userId },
    data: {
      ipHash: "anonymized_gdpr_ip",
      userAgent: null,
      referer: null,
    },
  });

  // 3. Log GDPR audit trail
  await db.auditLog.create({
    data: {
      userId: null,
      action: "gdpr_user_anonymized",
      resource: "user",
      resourceId: userId,
      detailsJson: JSON.stringify({ anonymizedAt: new Date() }),
    },
  });

  return updatedUser;
}
