import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { requestWithdrawal, approveAndPayWithdrawal } from "../withdrawals";
import { getUserWalletBalance } from "../balance";

describe("Withdrawal Workflow Engine", () => {
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const user = await db.user.create({
      data: {
        email: "withdraw_user@example.com",
        name: "Withdraw User",
      },
    });
    userId = user.id;

    // Add $50.00 confirmed balance (5000 minor units)
    await db.walletEntry.create({
      data: {
        userId,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 5000,
        currency: "USD",
        description: "Confirmed balance",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("prevents withdrawal request exceeding available confirmed balance", async () => {
    await expect(
      requestWithdrawal({
        userId,
        amountMinor: 10000, // $100 requested when only $50 available
        payoutMethod: "paypal",
        payoutDetails: "user@example.com",
      })
    ).rejects.toThrow(/Insufficient confirmed balance/);
  });

  it("handles full withdrawal request -> admin approval -> paid lifecycle", async () => {
    // 1. User requests $20 withdrawal (2000 minor units)
    const withdrawal = await requestWithdrawal({
      userId,
      amountMinor: 2000,
      payoutMethod: "paypal",
      payoutDetails: "user@example.com",
    });

    expect(withdrawal.status).toBe("requested");

    // Check balance after request
    let bal = await getUserWalletBalance(userId);
    expect(bal.confirmedMinor).toBe(3000); // $50 - $20 = $30 remaining confirmed
    expect(bal.paidMinor).toBe(0);

    // 2. Admin approves & pays withdrawal
    const paidWithdrawal = await approveAndPayWithdrawal(withdrawal.id);
    expect(paidWithdrawal.status).toBe("paid");

    // Check balance after payment
    bal = await getUserWalletBalance(userId);
    expect(bal.confirmedMinor).toBe(3000);
    expect(bal.paidMinor).toBe(2000); // $20 paid
    expect(bal.totalMinor).toBe(5000);
  });
});
