import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { recordConversionLedgerState } from "../ledger";
import { getUserWalletBalance } from "../balance";

describe("Append-Only Ledger Posting Engine", () => {
  let userId: string;
  let storeId: string;
  let conversionId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const user = await db.user.create({
      data: {
        email: "ledger_post_user@example.com",
        name: "Ledger User",
      },
    });
    userId = user.id;

    const store = await db.store.create({
      data: {
        name: "Ledger Store",
        slug: "ledger-store",
        domain: "ledgerstore.com",
        rawDestinationUrl: "https://ledgerstore.com",
      },
    });
    storeId = store.id;

    const network = await db.network.create({
      data: { name: "Network", slug: "net", linkTemplate: "http://net" },
    });

    const click = await db.click.create({
      data: {
        id: "click_ledger_1",
        subId: "click_ledger_1",
        storeId: store.id,
        userId: user.id,
        ipHash: "ip_hash",
        rawDestinationUrl: "https://ledgerstore.com",
        finalUrl: "https://ledgerstore.com",
      },
    });

    const conversion = await db.conversion.create({
      data: {
        clickId: click.id,
        storeId: store.id,
        networkId: network.id,
        networkTransactionId: "tx_ledger_101",
        amountMinor: 10000,
        commissionMinor: 1000,
        cashbackMinor: 800, // $8.00 = 800 minor units
        currency: "USD",
        status: "pending",
        transactionDate: new Date(),
      },
    });
    conversionId = conversion.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("posts pending cashback entry on pending conversion state", async () => {
    await recordConversionLedgerState(conversionId);

    const bal = await getUserWalletBalance(userId);
    expect(bal.pendingMinor).toBe(800);
    expect(bal.confirmedMinor).toBe(0);
  });

  it("moves pending to confirmed bucket on confirmed conversion state", async () => {
    await db.conversion.update({
      where: { id: conversionId },
      data: { status: "confirmed" },
    });

    await recordConversionLedgerState(conversionId);

    const bal = await getUserWalletBalance(userId);
    expect(bal.pendingMinor).toBe(0); // Debited pending
    expect(bal.confirmedMinor).toBe(800); // Credited confirmed
  });
});
