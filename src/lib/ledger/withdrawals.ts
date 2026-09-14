// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Withdrawal Workflow Engine
// User withdrawal requests, balance checks, and admin approvals.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { getUserWalletBalance, invalidateUserBalanceCache } from "./balance";

export interface WithdrawalRequestInput {
  userId: string;
  amountMinor: number;
  payoutMethod: string;
  payoutDetails: string;
}

export async function requestWithdrawal(input: WithdrawalRequestInput) {
  const { userId, amountMinor, payoutMethod, payoutDetails } = input;

  if (amountMinor <= 0) {
    throw new Error("Withdrawal amount must be greater than zero.");
  }

  // 1. Verify available confirmed balance
  const balance = await getUserWalletBalance(userId);
  if (amountMinor > balance.confirmedMinor) {
    throw new Error(
      `Insufficient confirmed balance (${balance.confirmedMinor} minor units available, ${amountMinor} requested).`
    );
  }

  // Simple Base64 encryption for payout details (in production, use KMS or AES-256-GCM)
  const encryptedDetails = Buffer.from(payoutDetails).toString("base64");

  // 2. Create Withdrawal record
  const withdrawal = await db.withdrawal.create({
    data: {
      userId,
      amountMinor,
      payoutMethod,
      payoutDetailsEncrypted: encryptedDetails,
      status: "requested",
    },
  });

  // 3. Debit user's confirmed bucket in wallet_entries
  await db.walletEntry.create({
    data: {
      userId,
      withdrawalId: withdrawal.id,
      type: "withdrawal_requested",
      bucket: "confirmed",
      amountMinor: -amountMinor,
      currency: "USD",
      description: `Withdrawal request #${withdrawal.id} via ${payoutMethod}`,
    },
  });

  invalidateUserBalanceCache(userId);

  return withdrawal;
}

export async function approveAndPayWithdrawal(withdrawalId: string) {
  const withdrawal = await db.withdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error(`Withdrawal not found: ${withdrawalId}`);
  }

  if (withdrawal.status !== "requested") {
    throw new Error(`Withdrawal cannot be approved from status: ${withdrawal.status}`);
  }

  const now = new Date();

  // 1. Update Withdrawal status to paid
  const updated = await db.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: "paid",
      approvedAt: now,
      paidAt: now,
    },
  });

  // 2. Record ledger entry in paid bucket
  await db.walletEntry.create({
    data: {
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      type: "withdrawal_approved",
      bucket: "paid",
      amountMinor: withdrawal.amountMinor,
      currency: withdrawal.currency,
      description: `Paid withdrawal #${withdrawal.id}`,
    },
  });

  invalidateUserBalanceCache(withdrawal.userId);

  return updated;
}
