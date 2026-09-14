import { describe, it, expect } from "vitest";
import { awinConnector } from "../awin";

describe("Awin Network Connector", () => {
  it("tests credentials validation", async () => {
    const invalid = await awinConnector.testCredentials({});
    expect(invalid.success).toBe(false);

    const valid = await awinConnector.testCredentials({
      apiKey: "test_key",
      publisherId: "123456",
    });
    expect(valid.success).toBe(true);
  });

  it("fetches and normalizes Awin offers from fixture", async () => {
    const offers = await awinConnector.fetchOffers({ apiKey: "key", publisherId: "123456" });

    expect(offers.length).toBeGreaterThan(0);
    const offer = offers[0];
    expect(offer.networkOfferId).toBe("100501");
    expect(offer.merchantName).toBe("Nike Store");
    expect(offer.code).toBe("SUMMER20");
    expect(offer.destinationUrl).toContain("awinmid=7001");
  });

  it("fetches and normalizes Awin conversions with minor unit precision", async () => {
    const since = new Date("2026-01-01");
    const conversions = await awinConnector.fetchConversions(
      { apiKey: "key", publisherId: "123456" },
      since
    );

    expect(conversions.length).toBeGreaterThan(0);
    const tx = conversions[0];
    expect(tx.networkTransactionId).toBe("987654321");
    expect(tx.clickRef).toBe("click_test_human_101");
    expect(tx.commissionMinor).toBe(1250); // $12.50 = 1250 minor units
    expect(tx.amountMinor).toBe(12500); // $125.00 = 12500 minor units
    expect(tx.status).toBe("confirmed");
  });

  it("maps normalized offer to Prisma Coupon payload with dedupe hash", () => {
    const offer = {
      networkId: "awin",
      networkOfferId: "100501",
      merchantId: "7001",
      merchantName: "Nike Store",
      title: "20% OFF Summer Sneakers",
      code: "SUMMER20",
      discountText: "Code: SUMMER20",
      destinationUrl: "https://awin.com/link",
    };

    const couponData = awinConnector.mapToCoupon(offer, "store_nike_id");
    expect(couponData.storeId).toBe("store_nike_id");
    expect(couponData.code).toBe("SUMMER20");
    expect(couponData.type).toBe("code");
    expect(couponData.dedupeHash).toBeDefined();
    expect(couponData.dedupeHash.length).toBe(64); // SHA-256 length
  });
});
