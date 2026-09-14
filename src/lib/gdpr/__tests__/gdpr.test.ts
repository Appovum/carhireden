import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { exportUserData, anonymizeAndDeleteUser } from "../index";

describe("GDPR Data Export & Erasure Manager", () => {
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const user = await db.user.create({
      data: {
        email: "gdpr_user@example.com",
        name: "GDPR User",
      },
    });
    userId = user.id;

    await db.walletEntry.create({
      data: {
        userId,
        type: "cashback_confirmed",
        bucket: "confirmed",
        amountMinor: 1500,
        currency: "USD",
        description: "Confirmed cashback",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("exports full user data archive in JSON format", async () => {
    const data = await exportUserData(userId);
    expect(data.profile.email).toBe("gdpr_user@example.com");
    expect(data.walletEntries.length).toBe(1);
    expect(data.walletEntries[0].amountMinor).toBe(1500);
  });

  it("anonymizes user personal data while retaining financial ledger entries for audit compliance", async () => {
    const anonymized = await anonymizeAndDeleteUser(userId);
    expect(anonymized.name).toBe("Anonymized User");
    expect(anonymized.email).not.toBe("gdpr_user@example.com");
    expect(anonymized.email).toContain("@gdpr.deleted");

    // Verify financial wallet entry remains intact for audit compliance
    const walletCount = await db.walletEntry.count({
      where: { userId },
    });
    expect(walletCount).toBe(1);
  });
});
