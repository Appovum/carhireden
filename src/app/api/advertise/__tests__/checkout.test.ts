import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../checkout/route";

describe("Self-Serve Advertiser Placement Checkout API", () => {
  let storeId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const store = await db.store.create({
      data: {
        name: "Advertiser Brand",
        slug: "advertiser-brand",
        domain: "advertiser.com",
        rawDestinationUrl: "https://advertiser.com",
      },
    });
    storeId = store.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates FeaturedOrder and calculates minor unit price based on duration", async () => {
    const req = new NextRequest("http://localhost:3000/api/advertise/checkout", {
      method: "POST",
      body: JSON.stringify({
        storeId,
        durationDays: 7,
        planType: "featured_store",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orderId).toBeDefined();
    expect(data.priceMinor).toBe(10500); // 7 * $15.00 = $105.00 = 10500 minor units

    const order = await db.featuredOrder.findUnique({
      where: { id: data.orderId },
    });

    expect(order).not.toBeNull();
    expect(order?.storeId).toBe(storeId);
  });
});
