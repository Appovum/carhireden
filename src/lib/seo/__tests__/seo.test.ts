import { describe, it, expect } from "vitest";
import { generateOfferJsonLd, generateFaqJsonLd, generateBreadcrumbJsonLd } from "../jsonLd";
import { buildMetaTitle, buildMetaDescription } from "../metaTemplates";

describe("SEO Suite (JSON-LD & Meta Templates)", () => {
  it("generates Schema.org Offer JSON-LD", () => {
    const jsonLd = generateOfferJsonLd({
      title: "20% OFF Summer Deal",
      discountText: "20% OFF",
      merchantName: "Nike",
      url: "https://couponpilot.com/go/123",
    });

    expect(jsonLd["@type"]).toBe("Offer");
    expect(jsonLd.name).toBe("20% OFF Summer Deal");
    expect(jsonLd.offeredBy.name).toBe("Nike");
  });

  it("substitutes meta template variables dynamically", () => {
    const template = "{store_name} Coupon Codes ({current_year}) — {discount_text}";
    const title = buildMetaTitle(template, {
      store_name: "Nike",
      discount_text: "50% OFF",
    });

    const currentYear = new Date().getFullYear().toString();
    expect(title).toContain("Nike Coupon Codes");
    expect(title).toContain(currentYear);
    expect(title).toContain("50% OFF");
  });
});
