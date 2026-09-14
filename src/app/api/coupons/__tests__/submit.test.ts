import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../submit/route";

describe("Merchant Coupon Submission Queue API", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("inserts submitted merchant coupon into database with draft status", async () => {
    const req = new NextRequest("http://localhost:3000/api/coupons/submit", {
      method: "POST",
      body: JSON.stringify({
        storeName: "Submitted Merchant",
        title: "50% OFF Flash Sale",
        code: "FLASH50",
        discountText: "50% OFF",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.couponId).toBeDefined();

    const coupon = await db.coupon.findUnique({
      where: { id: data.couponId },
    });

    expect(coupon).not.toBeNull();
    expect(coupon?.status).toBe("draft");
    expect(coupon?.code).toBe("FLASH50");
  });
});
