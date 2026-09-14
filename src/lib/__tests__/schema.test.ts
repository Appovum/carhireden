import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../db";

describe("Database Schema & Ledger Integration Tests", () => {
  beforeAll(async () => {
    // Clean tables for tests
    await db.walletEntry.deleteMany({});
    await db.conversion.deleteMany({});
    await db.click.deleteMany({});
    await db.coupon.deleteMany({});
    await db.store.deleteMany({});
    await db.user.deleteMany({});
    await db.network.deleteMany({});
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("enforces dedupeHash uniqueness on Coupons", async () => {
    const store = await db.store.create({
      data: {
        name: "Test Store",
        slug: "test-store-dedupe",
        domain: "teststore.com",
        rawDestinationUrl: "https://teststore.com",
      },
    });

    await db.coupon.create({
      data: {
        storeId: store.id,
        title: "20% Off",
        discountText: "20% OFF",
        dedupeHash: "hash_abc_123",
      },
    });

    await expect(
      db.coupon.create({
        data: {
          storeId: store.id,
          title: "Duplicate 20% Off",
          discountText: "20% OFF",
          dedupeHash: "hash_abc_123",
        },
      })
    ).rejects.toThrow();
  });

  it("enforces composite unique constraint on (networkId, networkTransactionId) for Conversions", async () => {
    const network = await db.network.create({
      data: {
        name: "Awin Test",
        slug: "awin-test",
        linkTemplate: "https://awin.com/{subid}",
      },
    });

    const store = await db.store.create({
      data: {
        name: "Awin Store",
        slug: "awin-store",
        domain: "awinstore.com",
        rawDestinationUrl: "https://awinstore.com",
      },
    });

    await db.conversion.create({
      data: {
        storeId: store.id,
        networkId: network.id,
        networkTransactionId: "TX_1001",
        amountMinor: 5000,
        commissionMinor: 500,
        cashbackMinor: 400,
        currency: "USD",
        status: "pending",
        transactionDate: new Date(),
      },
    });

    await expect(
      db.conversion.create({
        data: {
          storeId: store.id,
          networkId: network.id,
          networkTransactionId: "TX_1001",
          amountMinor: 5000,
          commissionMinor: 500,
          cashbackMinor: 400,
          currency: "USD",
          status: "pending",
          transactionDate: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  it("calculates user wallet balance correctly from append-only ledger entries", async () => {
    const user = await db.user.create({
      data: {
        email: "ledger-test@example.com",
        name: "Ledger Tester",
      },
    });

    // Insert append-only ledger entries
    // Entry 1: Pending cashback +$5.00 (500 minor units)
    await db.walletEntry.create({
      data: {
        userId: user.id,
        type: "cashback_pending",
        bucket: "pending",
        amountMinor: 500,
        currency: "USD",
        description: "Cashback pending for purchase at TestStore",
      },
    });

    // Entry 2: Confirmed cashback +$10.00 (1000 minor units)
    await db.walletEntry.create({
      data: {
        userId: user.id,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 1000,
        currency: "USD",
        description: "Cashback confirmed for purchase at TestStore",
      },
    });

    // Entry 3: Withdrawal requested -$4.00 (-400 minor units) from confirmed bucket
    await db.walletEntry.create({
      data: {
        userId: user.id,
        type: "withdrawal_requested",
        bucket: "confirmed",
        amountMinor: -400,
        currency: "USD",
        description: "Withdrawal requested via PayPal",
      },
    });

    // Aggregate ledger sums by bucket for user
    const pendingSum = await db.walletEntry.aggregate({
      where: { userId: user.id, bucket: "pending" },
      _sum: { amountMinor: true },
    });

    const confirmedSum = await db.walletEntry.aggregate({
      where: { userId: user.id, bucket: "confirmed" },
      _sum: { amountMinor: true },
    });

    expect(pendingSum._sum.amountMinor).toBe(500); // $5.00
    expect(confirmedSum._sum.amountMinor).toBe(600); // $10.00 - $4.00 = $6.00
  });
});
