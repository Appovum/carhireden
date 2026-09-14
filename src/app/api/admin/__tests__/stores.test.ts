import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { GET, POST } from "../stores/route";

describe("Admin API — Store Management & Merchant Review Queue", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates a new store and lists pending review merchants", async () => {
    const postReq = new NextRequest("http://localhost:3000/api/admin/stores", {
      method: "POST",
      body: JSON.stringify({
        name: "Admin Review Store",
        slug: "admin-review-store",
        domain: "adminreview.com",
        rawDestinationUrl: "https://adminreview.com",
        isActive: false, // Pending review
      }),
    });

    const postRes = await POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.store.id).toBeDefined();

    const getReq = new NextRequest("http://localhost:3000/api/admin/stores?status=pending_review");
    const getRes = await GET(getReq);
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.stores.length).toBe(1);
    expect(getData.stores[0].slug).toBe("admin-review-store");
  });
});
