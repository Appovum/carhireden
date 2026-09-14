// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Referrals & Bonuses API Route
// Route: GET/POST /api/admin/referrals
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // 1. Fetch default bonus rate from db.setting
    let defaultBonusMinor = 500; // $5.00 default fallback
    const bonusSetting = await db.setting.findUnique({
      where: { key: "referral_default_bonus_minor" },
    });
    if (bonusSetting?.valueJson) {
      try {
        const parsed = JSON.parse(bonusSetting.valueJson);
        if (typeof parsed === "number" && !isNaN(parsed)) {
          defaultBonusMinor = parsed;
        }
      } catch {}
    }

    // Fetch users who were referred by another user
    const referredUsers = await db.user.findMany({
      where: { referredById: { not: null } },
      include: {
        referredBy: {
          select: { id: true, email: true, name: true, referralCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch all referral bonus wallet entries to compute total payouts & match credited bonuses
    const bonusEntries = await db.walletEntry.findMany({
      where: { type: "referral_bonus" },
    });

    const totalBonusPaidMinor = bonusEntries.reduce((sum, e) => sum + e.amountMinor, 0);

    const formattedReferrals = referredUsers.map((u) => {
      // Check if a referral bonus was credited for this specific referral
      const hasSpecificBonus = bonusEntries.find(
        (entry) =>
          entry.userId === u.referredById &&
          (entry.description.includes(u.email) ||
            (u.name && entry.description.includes(u.name)) ||
            entry.description.includes(u.id))
      );

      // Fallback: check if referrer has bonus entries
      const matchingEntry = hasSpecificBonus || bonusEntries.find((entry) => entry.userId === u.referredById);
      const isBonusPaid = Boolean(matchingEntry);

      return {
        id: u.id,
        referrerId: u.referredBy?.id,
        referrerEmail: u.referredBy?.email || "N/A",
        referrerName: u.referredBy?.name || "Shopper",
        referralCode: u.referredBy?.referralCode || u.referredBy?.id?.slice(-8) || "code",
        referredUserEmail: u.email,
        referredUserName: u.name || "Shopper",
        joinedDate: u.createdAt.toISOString(),
        bonusStatus: isBonusPaid ? "credited" : "pending_qualifying_purchase",
        bonusAmountMinor: matchingEntry ? matchingEntry.amountMinor : defaultBonusMinor,
      };
    });

    // Unique referrers count
    const uniqueReferrersCount = new Set(referredUsers.map((u) => u.referredById)).size;

    return NextResponse.json({
      success: true,
      stats: {
        totalReferrals: referredUsers.length,
        totalReferrers: uniqueReferrersCount,
        totalBonusPaidMinor,
        defaultBonusMinor,
      },
      referrals: formattedReferrals,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to load referrals data." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referrerId, referredUserId, amountMinor } = body;

    // Action 1: Update Default Referral Bonus Rate
    if (action === "update_bonus_rate") {
      const parsedAmount = typeof amountMinor === "number" ? amountMinor : parseInt(amountMinor, 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ success: false, error: "Invalid bonus amount." }, { status: 400 });
      }

      await db.setting.upsert({
        where: { key: "referral_default_bonus_minor" },
        update: { valueJson: JSON.stringify(parsedAmount), category: "referrals" },
        create: { key: "referral_default_bonus_minor", valueJson: JSON.stringify(parsedAmount), category: "referrals" },
      });

      return NextResponse.json({
        success: true,
        message: `Default referral bonus rate updated to $${(parsedAmount / 100).toFixed(2)}.`,
        defaultBonusMinor: parsedAmount,
      });
    }

    // Action 2: Credit Referral Bonus
    if (action === "credit_bonus") {
      if (!referrerId) {
        return NextResponse.json({ success: false, error: "Referrer ID required." }, { status: 400 });
      }

      const referrer = await db.user.findUnique({ where: { id: referrerId } });
      if (!referrer) {
        return NextResponse.json({ success: false, error: "Referrer user not found." }, { status: 404 });
      }

      const referredUser = referredUserId ? await db.user.findUnique({ where: { id: referredUserId } }) : null;

      // Determine bonus amount: passed amount, or system default
      let bonusMinor = typeof amountMinor === "number" ? amountMinor : 500;
      if (!amountMinor) {
        const bonusSetting = await db.setting.findUnique({ where: { key: "referral_default_bonus_minor" } });
        if (bonusSetting?.valueJson) {
          try {
            const parsed = JSON.parse(bonusSetting.valueJson);
            if (typeof parsed === "number" && !isNaN(parsed)) bonusMinor = parsed;
          } catch {}
        }
      }

      // Add wallet entry for referral bonus
      const entry = await db.walletEntry.create({
        data: {
          userId: referrerId,
          type: "referral_bonus",
          bucket: "confirmed",
          amountMinor: bonusMinor,
          currency: "USD",
          description: `Referral bonus for inviting ${referredUser?.name || referredUser?.email || "friend"}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Referral bonus of $${(bonusMinor / 100).toFixed(2)} credited to ${referrer.email}.`,
        entry,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Action failed." }, { status: 500 });
  }
}
