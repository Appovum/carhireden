import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../route";

describe("Installer Bootstrap API", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("bootstraps admin account and site settings on initial run", async () => {
    const req = new NextRequest("http://localhost:3000/api/install", {
      method: "POST",
      body: JSON.stringify({
        adminEmail: "owner_bootstrap@example.com",
        adminPassword: "MasterPassword123!",
        adminName: "Owner",
        siteName: "My Coupon Store",
        defaultCurrency: "USD",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const admin = await db.user.findUnique({
      where: { email: "owner_bootstrap@example.com" },
    });

    expect(admin).not.toBeNull();
    expect(admin?.role).toBe("admin");
  });

  it("locks installer and blocks re-installation when an admin user already exists", async () => {
    const reReq = new NextRequest("http://localhost:3000/api/install", {
      method: "POST",
      body: JSON.stringify({
        adminEmail: "hijacker@example.com",
        adminPassword: "HackPassword123!",
      }),
    });

    const reRes = await POST(reReq);
    const reData = await reRes.json();

    expect(reRes.status).toBe(403);
    expect(reData.success).toBe(false);
    expect(reData.message).toContain("already installed");
  });
});
