import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../create/route";

describe("Click Action API (Server-Side Click Creator)", () => {
  let storeId: string;
  let couponId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const store = await db.store.create({
      data: {
        name: "Click Action Store",
        slug: "click-action-store",
        domain: "clickaction.com",
        rawDestinationUrl: "https://clickaction.com",
      },
    });
    storeId = store.id;

    const coupon = await db.coupon.create({
      data: {
        storeId: store.id,
        title: "Click Deal",
        discountText: "25% OFF",
        dedupeHash: "click_action_dedupe_1",
      },
    });
    couponId = coupon.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates click row in database and returns /go/[clickId] URL", async () => {
    const req = new NextRequest("http://localhost:3000/api/click/create", {
      method: "POST",
      body: JSON.stringify({
        couponId,
        storeId,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.clickId).toBeDefined();
    expect(data.clickUrl).toContain(`/go/${data.clickId}`);

    // Verify database click row
    const savedClick = await db.click.findUnique({
      where: { id: data.clickId },
    });
    expect(savedClick).not.toBeNull();
    expect(savedClick?.storeId).toBe(storeId);
  });
});
