import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { runImport } from "../engine";

describe("Import Pipeline Engine (Idempotency & Dry-Run)", () => {
  let importSourceId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const network = await db.network.create({
      data: {
        name: "Awin Importer Test",
        slug: "awin",
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
        apiCredentialsEncrypted: JSON.stringify({ publisherId: "123456" }),
      },
    });

    const source = await db.importSource.create({
      data: {
        networkId: network.id,
        name: "Awin Primary Feed",
      },
    });
    importSourceId = source.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("supports dryRun preview without touching DB", async () => {
    const res = await runImport(importSourceId, { dryRun: true });

    expect(res.dryRun).toBe(true);
    expect(res.previewItems).toBeDefined();
    expect(res.previewItems!.length).toBeGreaterThan(0);

    const count = await db.coupon.count();
    expect(count).toBe(0); // Zero DB writes in dry-run mode
  });

  it("executes import and inserts coupons on first run", async () => {
    const res = await runImport(importSourceId, { dryRun: false });

    expect(res.dryRun).toBe(false);
    expect(res.itemsInserted).toBeGreaterThan(0);

    const count = await db.coupon.count();
    expect(count).toBe(res.itemsInserted);
  });

  it("guarantees 100% idempotency: re-running feed inserts 0 new items", async () => {
    const initialCount = await db.coupon.count();

    const secondRun = await runImport(importSourceId, { dryRun: false });

    expect(secondRun.itemsInserted).toBe(0); // 0 new items inserted

    const finalCount = await db.coupon.count();
    expect(finalCount).toBe(initialCount);
  });
});
