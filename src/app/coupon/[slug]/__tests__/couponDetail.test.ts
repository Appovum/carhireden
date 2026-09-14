import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { generateOfferJsonLd } from "@/lib/seo/jsonLd";

describe("Coupon Detail Page & JSON-LD", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("generates Schema.org Offer JSON-LD metadata correctly", () => {
    const jsonLd = generateOfferJsonLd({
      title: "20% OFF Summer Shoes",
      discountText: "20% OFF",
      merchantName: "Nike",
      url: "https://couponpilot.com/coupon/c123",
    });

    expect(jsonLd["@type"]).toBe("Offer");
    expect(jsonLd.name).toBe("20% OFF Summer Shoes");
    expect(jsonLd.offeredBy.name).toBe("Nike");
  });
});
