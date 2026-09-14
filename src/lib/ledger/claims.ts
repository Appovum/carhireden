// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Missing Cashback Claim Queue & Wallet Settlement
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface ClaimInput {
  userId: string;
  storeId: string;
  storeName?: string;
  clickId?: string;
  orderId?: string;
  orderNumber?: string;
  purchaseDate?: Date;
  purchaseAmountMinor: number;
  currency?: string;
  notes?: string;
}

export async function submitMissingCashbackClaim(input: ClaimInput) {
  const {
    userId,
    storeId,
    storeName,
    clickId,
    orderId,
    orderNumber,
    purchaseDate = new Date(),
    purchaseAmountMinor,
    currency = "USD",
    notes,
  } = input;
  const finalOrderId = orderId || orderNumber || `ORD_${Date.now()}`;

  // Fetch store name if not explicitly passed
  let resolvedStoreName = storeName;
  if (!resolvedStoreName && storeId) {
    const store = await db.store.findUnique({ where: { id: storeId } });
    if (store) resolvedStoreName = store.name;
  }

  const auditRecord = await db.auditLog.create({
    data: {
      userId,
      action: "missing_cashback_claim_submitted",
      resource: "store",
      resourceId: storeId,
      detailsJson: JSON.stringify({
        clickId: clickId || null,
        orderId: finalOrderId,
        orderNumber: finalOrderId,
        storeName: resolvedStoreName || "Store",
        purchaseDate,
        purchaseAmountMinor,
        currency,
        notes,
        status: "pending_review",
      }),
    },
  });

  return {
    claimId: auditRecord.id,
    clickId,
    status: "pending_review",
  };
}

export async function getUserMissingCashbackClaims(userId: string) {
  const logs = await db.auditLog.findMany({
    where: {
      userId,
      action: "missing_cashback_claim_submitted",
    },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => {
    let details: any = {};
    try {
      details = log.detailsJson ? JSON.parse(log.detailsJson) : {};
    } catch {
      details = {};
    }
    return {
      id: log.id,
      orderNumber: details.orderNumber || details.orderId || "N/A",
      storeName: details.storeName || "Store",
      purchaseAmountMinor: details.purchaseAmountMinor || 0,
      currency: details.currency || "USD",
      status: details.status || "pending_review",
      createdAt: log.createdAt.toISOString(),
    };
  });
}

export async function listAllClaimsForAdmin() {
  const logs = await db.auditLog.findMany({
    where: { action: "missing_cashback_claim_submitted" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => {
    let details: any = {};
    try {
      details = log.detailsJson ? JSON.parse(log.detailsJson) : {};
    } catch {
      details = {};
    }

    return {
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email || "shopper@couponpilot.com",
      storeName: details.storeName || "Store",
      orderNumber: details.orderNumber || details.orderId || "N/A",
      purchaseAmountMinor: details.purchaseAmountMinor || 0,
      clickId: details.clickId || null,
      clickDate: details.purchaseDate ? new Date(details.purchaseDate).toISOString().slice(0, 16).replace("T", " ") : null,
      status: details.status || "pending_review",
      createdAt: log.createdAt.toISOString(),
    };
  });
}

export async function resolveClaimByAdmin(claimId: string, approve: boolean) {
  const claimLog = await db.auditLog.findUnique({
    where: { id: claimId },
    include: { user: true },
  });

  if (!claimLog) {
    throw new Error("Claim not found.");
  }

  let details: any = {};
  try {
    details = claimLog.detailsJson ? JSON.parse(claimLog.detailsJson) : {};
  } catch {
    details = {};
  }

  const newStatus = approve ? "approved" : "rejected";
  details.status = newStatus;

  // Update audit log status
  await db.auditLog.update({
    where: { id: claimId },
    data: { detailsJson: JSON.stringify(details) },
  });

  // If approved, issue cashback WalletEntry to the user
  if (approve && claimLog.userId) {
    // Calculate cashback: 5% of purchase amount (or minimum 100 minor units = $1.00)
    const rawPurchaseAmount = details.purchaseAmountMinor || 1000;
    const cashbackAmountMinor = Math.max(100, Math.round(rawPurchaseAmount * 0.05));

    await db.walletEntry.create({
      data: {
        userId: claimLog.userId,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: cashbackAmountMinor,
        currency: details.currency || "USD",
        description: `Approved missing cashback for Order #${details.orderNumber || "claim"} (${details.storeName || "Store"})`,
      },
    });
  }

  return { success: true, claimId, status: newStatus };
}
