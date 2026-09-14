import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { GET, POST } from "../withdrawals/route";

describe("Admin API — Withdrawal Approval Queue", () => {
  let withdrawalId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const user = await db.user.create({
      data: { email: "admin_withdraw_test@example.com", name: "User" },
    });

    await db.walletEntry.create({
      data: {
        userId: user.id,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 5000,
        currency: "USD",
        description: "Confirmed balance",
      },
    });

    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amountMinor: 2000,
        currency: "USD",
        payoutMethod: "paypal",
        payoutDetailsEncrypted: "user@example.com",
        status: "requested",
      },
    });
    withdrawalId = withdrawal.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("lists requested withdrawals and approves payout", async () => {
    const getReq = new NextRequest("http://localhost:3000/api/admin/withdrawals?status=requested");
    const getRes = await GET(getReq);
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.withdrawals.length).toBe(1);

    const postReq = new NextRequest("http://localhost:3000/api/admin/withdrawals", {
      method: "POST",
      body: JSON.stringify({
        withdrawalId,
        action: "approve",
      }),
    });

    const postRes = await POST(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(200);
    expect(postData.withdrawal.status).toBe("paid");
  });
});
