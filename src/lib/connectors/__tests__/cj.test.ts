import { describe, it, expect } from "vitest";
import { cjConnector } from "../cj";

describe("CJ Network Connector", () => {
  it("tests credentials validation", async () => {
    const invalid = await cjConnector.testCredentials({});
    expect(invalid.success).toBe(false);

    const valid = await cjConnector.testCredentials({
      accessToken: "cj_pat_123456",
    });
    expect(valid.success).toBe(true);
  });

  it("fetches and normalizes CJ offers from fixture", async () => {
    const offers = await cjConnector.fetchOffers({ accessToken: "cj_pat_123456" });

    expect(offers.length).toBeGreaterThan(0);
    const offer = offers[0];
    expect(offer.networkOfferId).toBe("cj_link_501");
    expect(offer.merchantName).toBe("Target Brands");
    expect(offer.code).toBe("SAVE15NOW");
    // clickUrl from fixture should be stored VERBATIM — deep link intact
    expect(offer.destinationUrl).toBe("https://www.anrdoezrs.net/click-555111-3001?url=https%3A%2F%2Ftarget.com");
  });

  it("fetches and normalizes CJ conversions with minor unit precision", async () => {
    const since = new Date("2026-01-01");
    const conversions = await cjConnector.fetchConversions(
      { accessToken: "cj_pat_123456" },
      since
    );

    expect(conversions.length).toBeGreaterThan(0);
    const tx = conversions[0];
    expect(tx.networkTransactionId).toBe("cj_tx_8801");
    expect(tx.clickRef).toBe("click_cj_test_301");
    expect(tx.commissionMinor).toBe(1500); // $15.00 = 1500 minor units
    expect(tx.amountMinor).toBe(15000); // $150.00 = 15000 minor units
    expect(tx.status).toBe("confirmed");
  });

  it("maps normalized offer to Prisma Coupon payload with dedupe hash", () => {
    const offer = {
      networkId: "cj",
      networkOfferId: "cj_link_501",
      merchantId: "3001",
      merchantName: "Target Brands",
      title: "$15 OFF Purchases over $100",
      code: "SAVE15NOW",
      discountText: "Code: SAVE15NOW",
      destinationUrl: "https://anrdoezrs.net/click",
    };

    const couponData = cjConnector.mapToCoupon(offer, "store_target_id");
    expect(couponData.storeId).toBe("store_target_id");
    expect(couponData.code).toBe("SAVE15NOW");
    expect(couponData.type).toBe("code");
    expect(couponData.dedupeHash.length).toBe(64);
  });
});
