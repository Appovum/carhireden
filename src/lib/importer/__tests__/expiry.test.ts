import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { expireOutdatedCoupons } from "../expiry";

describe("Hourly Auto-Expiry Job", () => {
  beforeAll(async () => {
    await cleanDatabase();

    const store = await db.store.create({
      data: {
        name: "Expiry Store",
        slug: "expiry-store",
        domain: "expirystore.com",
        rawDestinationUrl: "https://expirystore.com",
      },
    });

    // Past expiry coupon
    await db.coupon.create({
      data: {
        storeId: store.id,
        title: "Expired Deal",
        discountText: "30% OFF",
        dedupeHash: "hash_expired_001",
        status: "active",
        expiresAt: new Date("2020-01-01T00:00:00Z"),
      },
    });

    // Future expiry coupon
    await db.coupon.create({
      data: {
        storeId: store.id,
        title: "Active Deal",
        discountText: "20% OFF",
        dedupeHash: "hash_active_002",
        status: "active",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("marks past coupons as expired while retaining rows in DB", async () => {
    const res = await expireOutdatedCoupons();
    expect(res.expiredCount).toBe(1);

    const expiredCoupon = await db.coupon.findUnique({
      where: { dedupeHash: "hash_expired_001" },
    });
    expect(expiredCoupon?.status).toBe("expired");

    const activeCoupon = await db.coupon.findUnique({
      where: { dedupeHash: "hash_active_002" },
    });
    expect(activeCoupon?.status).toBe("active");
  });
});
