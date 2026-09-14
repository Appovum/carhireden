import { describe, it, expect } from "vitest";
import {
  sendCashbackPendingEmail,
  sendCashbackConfirmedEmail,
  sendWithdrawalPaidEmail,
} from "../emailTemplates";

describe("Transactional Email Templates for Cashback State Changes", () => {
  it("sends pending cashback email notification", async () => {
    const res = await sendCashbackPendingEmail("user@example.com", "Nike", 1600, "USD");
    expect(res.success).toBe(true);
  });

  it("sends confirmed cashback email notification", async () => {
    const res = await sendCashbackConfirmedEmail("user@example.com", "Nike", 1600, "USD");
    expect(res.success).toBe(true);
  });

  it("sends withdrawal paid email notification", async () => {
    const res = await sendWithdrawalPaidEmail("user@example.com", 1000, "paypal", "USD");
    expect(res.success).toBe(true);
  });
});
