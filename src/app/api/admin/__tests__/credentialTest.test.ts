import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../networks/[id]/test/route";

describe("Admin API — Network Credential Test Button", () => {
  let networkId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const network = await db.network.create({
      data: {
        name: "Awin Test Network",
        slug: "awin",
        linkTemplate: "https://awin.com/{subid}",
        apiCredentialsEncrypted: JSON.stringify({ apiKey: "test_key", publisherId: "123456" }),
      },
    });
    networkId = network.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("returns success response when testing valid network credentials", async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/networks/${networkId}/test`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ id: networkId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("verified");
  });
});
