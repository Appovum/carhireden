import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { syncNetworkConversions } from "../sync";

describe("Conversion Sync & Attribution Engine", () => {
  let networkId: string;
  let storeId: string;
  let matchedClickId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const network = await db.network.create({
      data: {
        name: "Awin Sync Test",
        slug: "awin",
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
        apiCredentialsEncrypted: JSON.stringify({ publisherId: "123456" }),
      },
    });
    networkId = network.id;

    const store = await db.store.create({
      data: {
        name: "Nike Store",
        slug: "nike-store",
        domain: "nike.com",
        merchantId: "7001",
        affiliateNetworkId: network.id,
        rawDestinationUrl: "https://nike.com",
      },
    });
    storeId = store.id;

    matchedClickId = "click_test_human_101";
    await db.click.create({
      data: {
        id: matchedClickId,
        subId: matchedClickId,
        storeId: store.id,
        networkId: network.id,
        ipHash: "hash_ip",
        rawDestinationUrl: "https://nike.com",
        finalUrl: "https://nike.com",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("syncs conversions, attributes clickRef to clickId, and updates status", async () => {
    const res = await syncNetworkConversions(networkId, { since: new Date("2026-01-01") });

    expect(res.totalSynced).toBeGreaterThan(0);
    expect(res.matchedCount).toBeGreaterThan(0);
    expect(res.insertedCount).toBeGreaterThan(0);

    const matchedTx = await db.conversion.findFirst({
      where: { clickId: matchedClickId },
    });
    expect(matchedTx).not.toBeNull();
    expect(matchedTx?.status).toBe("confirmed");
    expect(matchedTx?.commissionMinor).toBe(1250); // $12.50
    expect(matchedTx?.cashbackMinor).toBe(1000); // 80% user cashback = $10.00 = 1000 minor units
  });

  it("deduplicates network transactions on re-sync", async () => {
    const res2 = await syncNetworkConversions(networkId, { since: new Date("2026-01-01") });

    expect(res2.insertedCount).toBe(0); // 0 new rows inserted
    expect(res2.updatedCount).toBe(res2.totalSynced);
  });
});
