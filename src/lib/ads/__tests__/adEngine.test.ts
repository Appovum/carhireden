import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { recordAdEvent } from "../adEngine";

describe("Ad Engine & Creative Event Counter", () => {
  let creativeId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const slot = await db.adSlot.create({
      data: {
        name: "in_feed_test",
        positionSlug: "in_feed_test",
      },
    });

    const creative = await db.adCreative.create({
      data: {
        adSlotId: slot.id,
        title: "Test Ad Banner",
        targetUrl: "https://example.com/ad",
      },
    });
    creativeId = creative.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("increments impression and click counts for active ad creatives", async () => {
    await recordAdEvent(creativeId, "impression");
    await recordAdEvent(creativeId, "click");

    const updated = await db.adCreative.findUnique({
      where: { id: creativeId },
    });

    expect(updated?.impressionCount).toBe(1);
    expect(updated?.clickCount).toBe(1);
  });
});
