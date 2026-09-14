import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../networks/preview-link/route";

describe("Admin API — Link Template Live Preview", () => {
  it("interpolates deep-link template and returns live output preview URL", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/networks/preview-link", {
      method: "POST",
      body: JSON.stringify({
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subid}&ued={destination_url_encoded}",
        affiliateId: "998877",
        merchantId: "4433",
        subId: "click_preview_123",
        destinationUrl: "https://example.com/item",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.previewUrl).toContain("awinmid=4433");
    expect(data.previewUrl).toContain("awinaffid=998877");
    expect(data.previewUrl).toContain("clickref=click_preview_123");
  });
});
