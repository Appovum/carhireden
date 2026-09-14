import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";

describe("A-Z Store Directory Engine", () => {
  beforeAll(async () => {
    await cleanDatabase();

    await db.store.createMany({
      data: [
        { name: "Adidas", slug: "adidas", domain: "adidas.com", rawDestinationUrl: "https://adidas.com" },
        { name: "Best Buy", slug: "bestbuy", domain: "bestbuy.com", rawDestinationUrl: "https://bestbuy.com" },
        { name: "Nike", slug: "nike", domain: "nike.com", rawDestinationUrl: "https://nike.com" },
      ],
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("queries active stores sorted alphabetically for A-Z directory", async () => {
    const stores = await db.store.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    expect(stores.length).toBe(3);
    expect(stores[0].name).toBe("Adidas");
    expect(stores[1].name).toBe("Best Buy");
    expect(stores[2].name).toBe("Nike");
  });
});
