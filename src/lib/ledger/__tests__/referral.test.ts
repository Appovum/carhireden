import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { awardReferralBonus } from "../ledger";
import { getUserWalletBalance } from "../balance";

describe("Referral Bonus Engine", () => {
  let referrerId: string;
  let referredId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const referrer = await db.user.create({
      data: {
        email: "referrer@example.com",
        name: "Referrer User",
      },
    });
    referrerId = referrer.id;

    const referred = await db.user.create({
      data: {
        email: "referred@example.com",
        name: "Referred Friend",
        referredById: referrer.id,
      },
    });
    referredId = referred.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("awards 10% referral bonus to referrer upon referred user confirmed cashback", async () => {
    // Referred user earns $50.00 cashback (5000 minor units)
    await awardReferralBonus(referrerId, referredId, 5000, "USD");

    const referrerBal = await getUserWalletBalance(referrerId);
    expect(referrerBal.confirmedMinor).toBe(500); // 10% of $50 = $5.00 = 500 minor units
  });
});
