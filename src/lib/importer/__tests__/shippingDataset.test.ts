import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { seedShippingDataset } from "../shippingDataset";

describe("Commercial Shipping Dataset Importer", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("seeds stores and coupons cleanly in batch mode", async () => {
    const res = await seedShippingDataset(10, 5); // 10 stores x 5 coupons = 50 coupons for fast unit test
    expect(res.storesSeeded).toBe(10);
    expect(res.couponsSeeded).toBe(50);

    const storeCount = await db.store.count();
    const couponCount = await db.coupon.count();

    expect(storeCount).toBe(10);
    expect(couponCount).toBe(50);
  });
});
