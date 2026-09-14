import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { getUserWalletBalance, invalidateUserBalanceCache } from "../balance";

describe("Wallet Balance Aggregator & Cache", () => {
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const user = await db.user.create({
      data: {
        email: "balance_test@example.com",
        name: "Balance Tester",
      },
    });
    userId = user.id;

    // Add pending cashback +$10.00 (1000 minor units)
    await db.walletEntry.create({
      data: {
        userId,
        type: "cashback_pending",
        bucket: "pending",
        amountMinor: 1000,
        currency: "USD",
        description: "Pending cashback",
      },
    });

    // Add confirmed cashback +$25.00 (2500 minor units)
    await db.walletEntry.create({
      data: {
        userId,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 2500,
        currency: "USD",
        description: "Confirmed cashback",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("calculates pending, confirmed, paid, and total balances", async () => {
    const bal = await getUserWalletBalance(userId);
    expect(bal.pendingMinor).toBe(1000);
    expect(bal.confirmedMinor).toBe(2500);
    expect(bal.paidMinor).toBe(0);
    expect(bal.totalMinor).toBe(3500);
  });

  it("invalidates cache on write", async () => {
    // Add extra entry
    await db.walletEntry.create({
      data: {
        userId,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 500,
        currency: "USD",
        description: "Extra cashback",
      },
    });

    invalidateUserBalanceCache(userId);

    const updatedBal = await getUserWalletBalance(userId);
    expect(updatedBal.confirmedMinor).toBe(3000);
  });
});
