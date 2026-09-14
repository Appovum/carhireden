// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Apply Referral Code API Route
// Route: POST /api/account/apply-referral
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateUserBalanceCache } from "@/lib/ledger/balance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, referralCode } = body;

    if (!userId || !referralCode || typeof referralCode !== "string") {
      return NextResponse.json(
        { success: false, message: "User ID and referral code are required." },
        { status: 400 }
      );
    }

    const cleanCode = referralCode.trim();
    if (cleanCode.length < 3) {
      return NextResponse.json(
        { success: false, message: "Invalid referral code." },
        { status: 400 }
      );
    }

    // Check user state
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found." }, { status: 404 });
    }

    if (user.referredById) {
      return NextResponse.json(
        { success: false, message: "You have already linked a referral account." },
        { status: 400 }
      );
    }

    // Find referrer by referral code, ID suffix, or email
    const referrer = await db.user.findFirst({
      where: {
        OR: [
          { referralCode: cleanCode },
          { referralCode: { endsWith: cleanCode } },
          { id: cleanCode },
          { id: { endsWith: cleanCode } },
          { email: { equals: cleanCode, mode: "insensitive" } },
        ],
      },
    });

    if (!referrer) {
      return NextResponse.json(
        { success: false, message: "Referral code or referrer account not found." },
        { status: 404 }
      );
    }

    if (referrer.id === userId) {
      return NextResponse.json(
        { success: false, message: "You cannot use your own referral code." },
        { status: 400 }
      );
    }

    // Update user's referredById
    await db.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    let bonusRateMinor = 500;
    try {
      const bonusSetting = await db.setting.findUnique({ where: { key: "referral_default_bonus_minor" } });
      if (bonusSetting?.valueJson) {
        const parsed = JSON.parse(bonusSetting.valueJson);
        if (typeof parsed === "number" && !isNaN(parsed)) bonusRateMinor = parsed;
      }
    } catch {}

    // Credit referral bonus to referrer
    await db.walletEntry.create({
      data: {
        userId: referrer.id,
        type: "referral_bonus",
        bucket: "confirmed",
        amountMinor: bonusRateMinor,
        currency: "USD",
        description: `Referral bonus for inviting ${user.name || user.email}`,
      },
    });

    invalidateUserBalanceCache(referrer.id);

    return NextResponse.json({
      success: true,
      message: `Successfully linked referral code! Invited by ${referrer.name || referrer.email}.`,
      referrer: {
        id: referrer.id,
        name: referrer.name,
        email: referrer.email,
        referralCode: referrer.referralCode,
      },
    });
  } catch (error: any) {
    console.error("[APPLY REFERRAL ERROR]", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while applying the referral code." },
      { status: 500 }
    );
  }
}
