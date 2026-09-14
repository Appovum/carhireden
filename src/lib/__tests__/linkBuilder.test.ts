import { describe, it, expect } from "vitest";
import { buildAffiliateLink } from "../linkBuilder";

describe("Link Builder Utility", () => {
  it("interpolates Awin deep link template correctly with snake_case placeholders", () => {
    const template = "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}";
    const link = buildAffiliateLink({
      linkTemplate: template,
      affiliateId: "123456",
      merchantId: "7890",
      subId: "click_abc_999",
      destinationUrl: "https://nike.com/air-max?discount=20",
    });

    expect(link).toBe(
      "https://www.awin1.com/cread.php?awinmid=7890&awinaffid=123456&clickref=click_abc_999&ued=https%3A%2F%2Fnike.com%2Fair-max%3Fdiscount%3D20"
    );
  });

  it("interpolates camelCase placeholders ({merchantId}, {publisherId}, {subId}, {destinationUrl})", () => {
    const template = "https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&clickref={subId}&ued={destinationUrl}";
    const link = buildAffiliateLink({
      linkTemplate: template,
      affiliateId: "3017873",
      merchantId: "95201",
      subId: "click_test_human_101",
      destinationUrl: "https://giftlab.com/products/gift-set",
    });

    expect(link).toBe(
      "https://www.awin1.com/cread.php?awinmid=95201&awinaffid=3017873&clickref=click_test_human_101&ued=https%3A%2F%2Fgiftlab.com%2Fproducts%2Fgift-set"
    );
    expect(link).not.toContain("{");
    expect(link).not.toContain("}");
  });

  it("percent-encodes destinationUrl in query parameter ued=", () => {
    const template = "https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&clickref={subId}&ued={destinationUrl}";
    const link = buildAffiliateLink({
      linkTemplate: template,
      affiliateId: "3017873",
      merchantId: "7001",
      subId: "click_123",
      destinationUrl: "https://nike.com/summer?size=10&color=blue",
    });

    expect(link).toContain("ued=https%3A%2F%2Fnike.com%2Fsummer%3Fsize%3D10%26color%3Dblue");
  });

  it("fails loudly (throws) when a placeholder cannot be resolved", () => {
    const template = "https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&clickref={subId}&ued={destinationUrl}";
    
    // Missing affiliateId
    expect(() =>
      buildAffiliateLink({
        linkTemplate: template,
        affiliateId: null,
        merchantId: "7001",
        subId: "click_123",
        destinationUrl: "https://nike.com",
      })
    ).toThrow(/unresolvable placeholder.*publisherId/i);

    // Missing merchantId
    expect(() =>
      buildAffiliateLink({
        linkTemplate: template,
        affiliateId: "3017873",
        merchantId: null,
        subId: "click_123",
        destinationUrl: "https://nike.com",
      })
    ).toThrow(/unresolvable placeholder.*merchantId/i);

    // Unknown placeholder in template
    expect(() =>
      buildAffiliateLink({
        linkTemplate: "https://example.com/?mid={merchantId}&unknown={unknownKey}",
        affiliateId: "123",
        merchantId: "456",
        subId: "click_123",
        destinationUrl: "https://nike.com",
      })
    ).toThrow(/unresolvable placeholder.*unknownKey/i);
  });

  it("falls back to raw destination URL when template is unconfigured or null", () => {
    const link = buildAffiliateLink({
      linkTemplate: null,
      subId: "click_123",
      destinationUrl: "https://example.com/checkout",
    });

    expect(link).toBe("https://example.com/checkout");
  });
});
