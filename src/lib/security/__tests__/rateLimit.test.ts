import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { checkRateLimit, clearRateLimitStore } from "../rateLimit";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { db } from "@/lib/db";

describe("Rate Limiter", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  beforeEach(() => {
    clearRateLimitStore();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("allows requests under the specified limit", async () => {
    const key = "ip_127_0_0_1_login";
    for (let i = 0; i < 3; i++) {
      const res = await checkRateLimit(key, 5, 60);
      expect(res.success).toBe(true);
    }
  });

  it("blocks requests exceeding the specified limit", async () => {
    const key = "ip_127_0_0_1_vote";
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, 3, 60);
    }

    const blocked = await checkRateLimit(key, 3, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
