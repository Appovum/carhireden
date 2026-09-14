import { describe, it, expect } from "vitest";
import { defaultEmailAdapter } from "../emailAdapter";
import { postDealToTelegram } from "../telegramPoster";

describe("Notifications Suite (Email & Telegram)", () => {
  it("sends email via EmailAdapter", async () => {
    const res = await defaultEmailAdapter.sendEmail({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello World</p>",
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it("posts deal to Telegram channel", async () => {
    const res = await postDealToTelegram({
      storeName: "Nike",
      title: "50% OFF Summer Shoes",
      discountText: "50% OFF",
      code: "SUMMER50",
      outboundUrl: "https://couponpilot.com/go/click_123",
    });

    expect(res.success).toBe(true);
  });
});
