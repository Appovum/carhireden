// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Step 0: End-to-End Revenue Path Integration Test
// Exercises the complete money chain against a real database.
// ═══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { GET as redirectHandler } from "@/app/go/[clickId]/route";
import { syncNetworkConversions } from "@/lib/conversions/sync";
import { recordConversionLedgerState } from "@/lib/ledger/ledger";
import { getUserWalletBalance } from "@/lib/ledger/balance";
import { requestWithdrawal, approveAndPayWithdrawal } from "@/lib/ledger/withdrawals";

describe("Step 0 — Money Chain End-to-End Revenue Path", () => {
  let userId: string;
  let storeId: string;
  let couponId: string;
  let networkId: string;
  const clickId = "click_e2e_revenue_9001";
  const networkTxId = "tx_e2e_awin_8001";

  beforeAll(async () => {
    await cleanDatabase();

    // 1. Setup User
    const user = await db.user.create({
      data: {
        email: "e2e_revenue_user@example.com",
        name: "E2E Revenue User",
      },
    });
    userId = user.id;

    // 2. Setup Network
    const network = await db.network.create({
      data: {
        name: "Awin E2E Network",
        slug: "awin",
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
        apiCredentialsEncrypted: JSON.stringify({ publisherId: "123456" }),
      },
    });
    networkId = network.id;

    // 3. Setup Store & Coupon
    const store = await db.store.create({
      data: {
        name: "E2E Nike Store",
        slug: "e2e-nike-store",
        domain: "e2enike.com",
        merchantId: "7001",
        affiliateNetworkId: network.id,
        rawDestinationUrl: "https://e2enike.com",
      },
    });
    storeId = store.id;

    const coupon = await db.coupon.create({
      data: {
        storeId: store.id,
        networkId: network.id,
        title: "20% OFF E2E Deal",
        discountText: "20% OFF",
        dedupeHash: "dedupe_e2e_hash_9001",
      },
    });
    couponId = coupon.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("Step 0.1 — Outbound click creates click row with SubID equal to clickId", async () => {
    const reqUrl = `http://localhost:3000/go/${clickId}?couponId=${couponId}&storeId=${storeId}&userId=${userId}`;
    const req = new NextRequest(reqUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "x-forwarded-for": "198.51.100.42",
      },
    });

    const response = await redirectHandler(req, { params: Promise.resolve({ clickId }) });

    expect(response.status).toBe(302);

    const clickRow = await db.click.findUnique({
      where: { id: clickId },
    });

    expect(clickRow).not.toBeNull();
    expect(clickRow?.subId).toBe(clickId);
    expect(clickRow?.userId).toBe(userId);
    expect(clickRow?.storeId).toBe(storeId);
  });

  it("Step 0.2 — Fixture conversion with matching clickRef creates attributed conversion row", async () => {
    const conversionFixture = [
      {
        id: networkTxId,
        url: "https://www.awin1.com/cread.php?awinmid=7001",
        advertiserId: "7001",
        advertiserName: "E2E Nike Store",
        publisherId: 123456,
        commissionAmount: { amount: 20.0, currency: "USD" },
        saleAmount: { amount: 200.0, currency: "USD" },
        commissionStatus: "pending",
        clickRefs: { clickRef: clickId },
        transactionDate: "2026-08-02T10:00:00Z",
      },
    ];

    const syncRes = await syncNetworkConversions(networkId, {
      since: new Date("2026-01-01"),
      fixtureData: conversionFixture,
    });

    expect(syncRes.matchedCount).toBe(1);
    expect(syncRes.insertedCount).toBe(1);

    const conversionRow = await db.conversion.findUnique({
      where: {
        networkId_networkTransactionId: {
          networkId,
          networkTransactionId: networkTxId,
        },
      },
    });

    expect(conversionRow).not.toBeNull();
    expect(conversionRow?.clickId).toBe(clickId);
    expect(conversionRow?.storeId).toBe(storeId);
    expect(conversionRow?.status).toBe("pending");
    expect(conversionRow?.commissionMinor).toBe(2000); // $20.00 = 2000 minor units
    expect(conversionRow?.cashbackMinor).toBe(1600); // 80% user share = $16.00 = 1600 minor units
  });

  it("Step 0.3 — Transition pending → confirmed appends wallet_entries rows without mutating existing entries", async () => {
    const conversion = await db.conversion.findUnique({
      where: {
        networkId_networkTransactionId: {
          networkId,
          networkTransactionId: networkTxId,
        },
      },
    });

    // Post pending ledger state
    await recordConversionLedgerState(conversion!.id);

    const initialEntriesCount = await db.walletEntry.count({
      where: { userId },
    });
    expect(initialEntriesCount).toBe(1); // 1 pending entry (+1600)

    // Transition conversion to confirmed
    await db.conversion.update({
      where: { id: conversion!.id },
      data: { status: "confirmed" },
    });

    await recordConversionLedgerState(conversion!.id);

    const updatedEntriesCount = await db.walletEntry.count({
      where: { userId },
    });
    expect(updatedEntriesCount).toBe(3); // +1 pending, -1 pending debit, +1 confirmed credit

    const entries = await db.walletEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Verify append-only entries
    expect(entries[0].type).toBe("cashback_pending");
    expect(entries[0].amountMinor).toBe(1600);

    expect(entries[1].type).toBe("cashback_pending");
    expect(entries[1].amountMinor).toBe(-1600);

    expect(entries[2].type).toBe("cashback_confirmed");
    expect(entries[2].amountMinor).toBe(1600);
  });

  it("Step 0.4 — Derived balance moves correctly for each bucket", async () => {
    const balance = await getUserWalletBalance(userId);

    expect(balance.pendingMinor).toBe(0);
    expect(balance.confirmedMinor).toBe(1600); // $16.00
    expect(balance.paidMinor).toBe(0);
    expect(balance.totalMinor).toBe(1600);
  });

  it("Step 0.5 — Request withdrawal → approve it → ledger and balances settle", async () => {
    // Request $10.00 withdrawal (1000 minor units)
    const withdrawal = await requestWithdrawal({
      userId,
      amountMinor: 1000,
      payoutMethod: "paypal",
      payoutDetails: "user@example.com",
    });

    let bal = await getUserWalletBalance(userId);
    expect(bal.confirmedMinor).toBe(600); // $16.00 - $10.00 = $6.00 = 600 minor units
    expect(bal.paidMinor).toBe(0);

    // Admin approves & pays withdrawal
    const paidWithdrawal = await approveAndPayWithdrawal(withdrawal.id);
    expect(paidWithdrawal.status).toBe("paid");

    bal = await getUserWalletBalance(userId);
    expect(bal.confirmedMinor).toBe(600);
    expect(bal.paidMinor).toBe(1000); // $10.00 paid
    expect(bal.totalMinor).toBe(1600);
  });

  it("Step 0.6 — Re-running conversion sync asserts nothing is double-counted", async () => {
    const conversionFixture = [
      {
        id: networkTxId,
        url: "https://www.awin1.com/cread.php?awinmid=7001",
        advertiserId: "7001",
        advertiserName: "E2E Nike Store",
        publisherId: 123456,
        commissionAmount: { amount: 20.0, currency: "USD" },
        saleAmount: { amount: 200.0, currency: "USD" },
        commissionStatus: "approved",
        clickRefs: { clickRef: clickId },
        transactionDate: "2026-08-02T10:00:00Z",
      },
    ];

    const reSyncRes = await syncNetworkConversions(networkId, {
      since: new Date("2026-01-01"),
      fixtureData: conversionFixture,
    });

    expect(reSyncRes.insertedCount).toBe(0); // 0 new rows inserted
    expect(reSyncRes.updatedCount).toBe(1);

    const conversion = await db.conversion.findUnique({
      where: {
        networkId_networkTransactionId: {
          networkId,
          networkTransactionId: networkTxId,
        },
      },
    });

    const entriesBefore = await db.walletEntry.count({ where: { userId } });
    await recordConversionLedgerState(conversion!.id);
    const entriesAfter = await db.walletEntry.count({ where: { userId } });

    expect(entriesAfter).toBe(entriesBefore); // Zero duplicate wallet entries created!

    const bal = await getUserWalletBalance(userId);
    expect(bal.confirmedMinor).toBe(600);
    expect(bal.paidMinor).toBe(1000);
  });
});
