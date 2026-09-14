import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { GET } from "../route";

describe("GET /go/[clickId] Route Handler Integration Tests", () => {
  let testStoreId: string;
  let testCouponId: string;
  let testNetworkId: string;

  beforeAll(async () => {
    await db.walletEntry.deleteMany({});
    await db.conversion.deleteMany({});
    await db.click.deleteMany({});
    await db.couponVote.deleteMany({});
    await db.coupon.deleteMany({});
    await db.storeCategory.deleteMany({});
    await db.alert.deleteMany({});
    await db.featuredOrder.deleteMany({});
    await db.store.deleteMany({});
    await db.importRun.deleteMany({});
    await db.importSource.deleteMany({});
    await db.network.deleteMany({});

    const network = await db.network.create({
      data: {
        name: "Awin",
        slug: "awin-redirect-test",
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
        apiCredentialsEncrypted: JSON.stringify({ affiliateId: "aff_999" }),
      },
    });
    testNetworkId = network.id;

    const store = await db.store.create({
      data: {
        name: "Redirect Store",
        slug: "redirect-store",
        domain: "redirectstore.com",
        merchantId: "merch_777",
        affiliateNetworkId: network.id,
        rawDestinationUrl: "https://redirectstore.com/deal",
      },
    });
    testStoreId = store.id;

    const coupon = await db.coupon.create({
      data: {
        storeId: store.id,
        networkId: network.id,
        title: "50% Off Test Deal",
        discountText: "50% OFF",
        destinationUrl: "https://redirectstore.com/promo-50",
        dedupeHash: "hash_redirect_50",
      },
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("logs click and returns 302 redirect with noindex header for human user", async () => {
    const clickId = "click_test_human_101";
    const reqUrl = `http://localhost:3000/go/${clickId}?couponId=${testCouponId}&storeId=${testStoreId}`;
    const req = new NextRequest(reqUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "x-forwarded-for": "203.0.113.195",
      },
    });

    const response = await GET(req, { params: Promise.resolve({ clickId }) });

    expect(response.status).toBe(302);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");

    const location = response.headers.get("Location");
    expect(location).toContain("awinmid=merch_777");
    expect(location).toContain("awinaffid=aff_999");
    expect(location).toContain(`clickref=${clickId}`);

    // Verify database click entry
    const savedClick = await db.click.findUnique({
      where: { id: clickId },
    });
    expect(savedClick).not.toBeNull();
    expect(savedClick?.isBot).toBe(false);
    expect(savedClick?.subId).toBe(clickId);
    expect(savedClick?.storeId).toBe(testStoreId);
  });

  it("flags bot click appropriately while still redirecting 302", async () => {
    const clickId = "click_test_bot_202";
    const reqUrl = `http://localhost:3000/go/${clickId}?couponId=${testCouponId}&storeId=${testStoreId}`;
    const req = new NextRequest(reqUrl, {
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      },
    });

    const response = await GET(req, { params: Promise.resolve({ clickId }) });

    expect(response.status).toBe(302);

    // Verify saved click in database has isBot: true
    const savedClick = await db.click.findUnique({
      where: { id: clickId },
    });
    expect(savedClick?.isBot).toBe(true);
    expect(savedClick?.botScore).toBe(1.0);
  });
});
