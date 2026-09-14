import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { autocompleteSearch } from "../search";

describe("Search & Autocomplete Engine", () => {
  beforeAll(async () => {
    await cleanDatabase();

    await db.store.create({
      data: {
        name: "Nike Store Search",
        slug: "nike-search",
        domain: "nike.com",
        rawDestinationUrl: "https://nike.com",
      },
    });

    await db.category.create({
      data: {
        name: "Sports Footwear",
        slug: "sports-footwear",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("finds matching stores and categories by prefix search query", async () => {
    const results = await autocompleteSearch("nike");
    expect(results.length).toBeGreaterThan(0);

    const storeRes = results.find((r) => r.type === "store");
    expect(storeRes).toBeDefined();
    expect(storeRes?.label).toBe("Nike Store Search");
  });

  it("returns default top stores for blank search query", async () => {
    const results = await autocompleteSearch("");
    expect(results.length).toBeGreaterThan(0);
  });
});
