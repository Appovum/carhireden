import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { findOrCreateMappedStore } from "../merchantMapper";

describe("Merchant Auto-Mapper", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("auto-creates draft store for unknown merchant", async () => {
    const res = await findOrCreateMappedStore("m_9001", "New Mystery Retailer", undefined, "https://mystery.com");
    expect(res.autoCreated).toBe(true);

    const store = await db.store.findUnique({ where: { id: res.storeId } });
    expect(store).not.toBeNull();
    expect(store?.isActive).toBe(false); // Flagged for admin review
    expect(store?.merchantId).toBe("m_9001");
  });

  it("reuses existing store when matching merchantId", async () => {
    const first = await findOrCreateMappedStore("m_9001", "New Mystery Retailer");
    const second = await findOrCreateMappedStore("m_9001", "New Mystery Retailer");

    expect(second.storeId).toBe(first.storeId);
    expect(second.autoCreated).toBe(false);
  });
});
