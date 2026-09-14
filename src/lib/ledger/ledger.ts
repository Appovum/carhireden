// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Append-Only Ledger Posting Engine
// Writes immutable wallet entries on conversion status state transitions
// and awards referral bonuses.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { invalidateUserBalanceCache } from "./balance";
import { calculateShare } from "@/lib/money";

export async function recordConversionLedgerState(conversionId: string): Promise<void> {
  const conversion = await db.conversion.findUnique({
    where: { id: conversionId },
    include: {
      click: {
        include: { user: true },
      },
      store: true,
    },
  });

  if (!conversion || !conversion.click || !conversion.click.userId) {
    // Unattributed conversion or non-logged-in click -> skip user ledger posting
    return;
  }

  const userId = conversion.click.userId;
  const storeName = conversion.store.name;

  if (conversion.status === "pending") {
    // Check if pending entry already exists
    const existingPending = await db.walletEntry.findFirst({
      where: { conversionId: conversion.id, type: "cashback_pending" },
    });

    if (!existingPending) {
      await db.walletEntry.create({
        data: {
          userId,
          conversionId: conversion.id,
          type: "cashback_pending",
          bucket: "pending",
          amountMinor: conversion.cashbackMinor,
          currency: conversion.currency,
          description: `Pending cashback for purchase at ${storeName}`,
        },
      });
      invalidateUserBalanceCache(userId);
    }
  } else if (conversion.status === "confirmed") {
    const existingConfirmed = await db.walletEntry.findFirst({
      where: { conversionId: conversion.id, type: "cashback_confirmed" },
    });

    if (!existingConfirmed) {
      // 1. Debit pending bucket
      await db.walletEntry.create({
        data: {
          userId,
          conversionId: conversion.id,
          type: "cashback_pending",
          bucket: "pending",
          amountMinor: -conversion.cashbackMinor,
          currency: conversion.currency,
          description: `Pending balance moved to confirmed for ${storeName}`,
        },
      });

      // 2. Credit confirmed bucket
      await db.walletEntry.create({
        data: {
          userId,
          conversionId: conversion.id,
          type: "cashback_confirmed",
          bucket: "confirmed",
          amountMinor: conversion.cashbackMinor,
          currency: conversion.currency,
          description: `Confirmed cashback for purchase at ${storeName}`,
        },
      });
      invalidateUserBalanceCache(userId);

      // 3. Award Referral Bonus if applicable
      const user = conversion.click.user;
      if (user?.referredById) {
        await awardReferralBonus(user.referredById, user.id, conversion.cashbackMinor, conversion.currency);
      }
    }
  } else if (conversion.status === "declined") {
    const existingDeclined = await db.walletEntry.findFirst({
      where: { conversionId: conversion.id, type: "cashback_declined" },
    });

    if (!existingDeclined) {
      // Debit pending bucket
      await db.walletEntry.create({
        data: {
          userId,
          conversionId: conversion.id,
          type: "cashback_declined",
          bucket: "pending",
          amountMinor: -conversion.cashbackMinor,
          currency: conversion.currency,
          description: `Declined cashback for purchase at ${storeName}`,
        },
      });
      invalidateUserBalanceCache(userId);
    }
  }
}

export async function awardReferralBonus(
  referrerUserId: string,
  referredUserId: string,
  baseCashbackMinor: number,
  currency: string = "USD"
): Promise<void> {
  // 10% referral bonus share
  const bonusMoney = calculateShare({ amountMinor: baseCashbackMinor, currency }, 10);
  if (bonusMoney.amountMinor <= 0) return;

  await db.walletEntry.create({
    data: {
      userId: referrerUserId,
      type: "referral_bonus",
      bucket: "confirmed",
      amountMinor: bonusMoney.amountMinor,
      currency,
      description: `Referral bonus from purchase by referred friend`,
      metadataJson: JSON.stringify({ referredUserId }),
    },
  });

  invalidateUserBalanceCache(referrerUserId);
}
