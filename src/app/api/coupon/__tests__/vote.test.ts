import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../vote/route";

describe("Coupon Vote API", () => {
  let couponId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const store = await db.store.create({
      data: {
        name: "Vote Store",
        slug: "vote-store",
        domain: "votestore.com",
        rawDestinationUrl: "https://votestore.com",
      },
    });

    const coupon = await db.coupon.create({
      data: {
        storeId: store.id,
        title: "Vote Deal",
        discountText: "15% OFF",
        dedupeHash: "vote_deal_hash_1",
        successRate: 100,
      },
    });
    couponId = coupon.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("persists upvote and updates success rate", async () => {
    const req = new NextRequest("http://localhost:3000/api/coupon/vote", {
      method: "POST",
      body: JSON.stringify({
        couponId,
        voteType: "up",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.successRate).toBe(100);

    const updatedCoupon = await db.coupon.findUnique({
      where: { id: couponId },
    });
    expect(updatedCoupon?.successRate).toBe(100);
  });
});
