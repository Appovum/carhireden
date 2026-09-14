import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import {
  calculateEpc,
  getStoreAggregates,
  getCouponAggregates,
  getCategoryAggregates,
  getDailyAggregates,
} from "../aggregates";

describe("Owner Aggregates & Analytics Engine", () => {
  let storeId: string;
  let couponId: string;
  let categoryId: string;
  const testDate = new Date("2026-08-01T12:00:00Z");

  beforeAll(async () => {
    await cleanDatabase();

    const category = await db.category.create({
      data: {
        name: "Footwear",
        slug: "footwear",
      },
    });
    categoryId = category.id;

    const store = await db.store.create({
      data: {
        name: "Analytics Store",
        slug: "analytics-store",
        domain: "analytics.com",
        rawDestinationUrl: "https://analytics.com",
      },
    });
    storeId = store.id;

    await db.storeCategory.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
      },
    });

    const coupon = await db.coupon.create({
      data: {
        storeId: store.id,
        title: "Analytics Deal",
        discountText: "10% OFF",
        dedupeHash: "hash_analytics_100",
      },
    });
    couponId = coupon.id;

    // Create 10 clicks
    for (let i = 0; i < 10; i++) {
      const click = await db.click.create({
        data: {
          id: `click_agg_${i}`,
          subId: `click_agg_${i}`,
          storeId: store.id,
          couponId: coupon.id,
          ipHash: "hash_ip",
          rawDestinationUrl: "https://analytics.com",
          finalUrl: "https://analytics.com",
          createdAt: testDate,
        },
      });

      // 2 conversions out of 10 clicks ($20 commission total = 2000 minor units)
      if (i < 2) {
        const network = await db.network.findFirst() || await db.network.create({
          data: { name: "Dummy", slug: "dummy", linkTemplate: "http://dummy" },
        });

        await db.conversion.create({
          data: {
            clickId: click.id,
            storeId: store.id,
            networkId: network.id,
            networkTransactionId: `tx_agg_${i}`,
            amountMinor: 10000,
            commissionMinor: 1000, // $10 commission per sale
            cashbackMinor: 800,
            currency: "USD",
            status: "confirmed",
            transactionDate: testDate,
          },
        });
      }
    }
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("calculates zero-safe EPC correctly", () => {
    expect(calculateEpc(2000, 10)).toBe(200); // 2000 cents commission / 10 clicks = 200 cents EPC ($2.00)
    expect(calculateEpc(2000, 0)).toBe(0);
  });

  it("calculates store performance aggregates", async () => {
    const agg = await getStoreAggregates(storeId);
    expect(agg.clicks).toBe(10);
    expect(agg.conversions).toBe(2);
    expect(agg.commissionMinor).toBe(2000);
    expect(agg.epcMinor).toBe(200);
  });

  it("calculates coupon performance aggregates", async () => {
    const agg = await getCouponAggregates(couponId);
    expect(agg.clicks).toBe(10);
    expect(agg.conversions).toBe(2);
    expect(agg.commissionMinor).toBe(2000);
    expect(agg.epcMinor).toBe(200);
  });

  it("calculates category performance aggregates", async () => {
    const agg = await getCategoryAggregates(categoryId);
    expect(agg.clicks).toBe(10);
    expect(agg.conversions).toBe(2);
  });

  it("calculates daily aggregates", async () => {
    const agg = await getDailyAggregates(testDate);
    expect(agg.clicks).toBe(10);
    expect(agg.conversions).toBe(2);
  });
});
