// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Auth & Session Manager
// Bcrypt password hashing, authentication, role checking, and anonymous click claiming.
// ═══════════════════════════════════════════════════════════════════

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { invalidateUserBalanceCache } from "@/lib/ledger/balance";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  return bcrypt.compareSync(password, storedHash);
}

export async function claimAnonymousClicks(userId: string, guestIpHash: string): Promise<number> {
  if (!guestIpHash) return 0;

  const result = await db.click.updateMany({
    where: {
      ipHash: guestIpHash,
      userId: null,
    },
    data: {
      userId,
    },
  });

  return result.count;
}

export interface RegisterInput {
  email: string;
  password?: string;
  name?: string;
  role?: "user" | "admin";
  guestIpHash?: string;
  referredByCode?: string;
}

export async function registerUser(input: RegisterInput) {
  const { email, password, name, role = "user", guestIpHash, referredByCode } = input;

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  let referredById: string | undefined = undefined;
  if (referredByCode) {
    const cleanCode = referredByCode.trim();
    if (cleanCode.length >= 3) {
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
      if (referrer) referredById = referrer.id;
    }
  }

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: password ? hashPassword(password) : null,
      name: name || null,
      role,
      referredById: referredById || null,
    },
  });

  if (referredById) {
    let bonusRateMinor = 500;
    try {
      const bonusSetting = await db.setting.findUnique({ where: { key: "referral_default_bonus_minor" } });
      if (bonusSetting?.valueJson) {
        const parsed = JSON.parse(bonusSetting.valueJson);
        if (typeof parsed === "number" && !isNaN(parsed)) bonusRateMinor = parsed;
      }
    } catch {}

    // Automatically credit referral bonus to referrer's wallet
    await db.walletEntry.create({
      data: {
        userId: referredById,
        type: "referral_bonus",
        bucket: "confirmed",
        amountMinor: bonusRateMinor,
        currency: "USD",
        description: `Referral bonus for inviting ${name || normalizedEmail}`,
      },
    });
    invalidateUserBalanceCache(referredById);
  }

  // Claim anonymous clicks on signup
  if (guestIpHash) {
    await claimAnonymousClicks(user.id, guestIpHash);
  }

  return user;
}

export async function loginUser(email: string, password: string, guestIpHash?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  // Claim anonymous clicks on login
  if (guestIpHash) {
    await claimAnonymousClicks(user.id, guestIpHash);
  }

  return user;
}
