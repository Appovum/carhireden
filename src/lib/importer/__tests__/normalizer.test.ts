import { describe, it, expect } from "vitest";
import { parseDiscountFromTitle, stripTrackingParams } from "../normalizer";

describe("Import Normalizer", () => {
  it("strips tracking parameters from destination URLs", () => {
    const rawUrl = "https://nike.com/air-max?utm_source=awin&utm_campaign=summer&gclid=12345&color=red";
    const cleanUrl = stripTrackingParams(rawUrl);

    expect(cleanUrl).not.toContain("utm_source");
    expect(cleanUrl).not.toContain("gclid");
    expect(cleanUrl).toContain("color=red");
  });

  it("parses percentage discount from titles", () => {
    const parsed = parseDiscountFromTitle("Save 25% Off Summer Collection");
    expect(parsed.discountText).toBe("25% OFF");
    expect(parsed.discountType).toBe("percentage");
    expect(parsed.discountValue).toBe(25);
  });

  it("parses fixed dollar discount from titles", () => {
    const parsed = parseDiscountFromTitle("$50 Off Order Over $200");
    expect(parsed.discountText).toBe("$50 OFF");
    expect(parsed.discountType).toBe("fixed");
    expect(parsed.discountValue).toBe(50);
  });

  it("parses free shipping from titles", () => {
    const parsed = parseDiscountFromTitle("Free Express Delivery on All Shoes");
    expect(parsed.discountText).toBe("Free Shipping");
    expect(parsed.discountType).toBe("free_shipping");
  });
});
