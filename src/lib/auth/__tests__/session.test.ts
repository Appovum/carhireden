import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { registerUser, loginUser } from "../session";

describe("Auth Session & Anonymous Click Claiming", () => {
  const guestIpHash = "hash_guest_ip_99";
  let storeId: string;
  let clickId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const store = await db.store.create({
      data: {
        name: "Claim Store",
        slug: "claim-store",
        domain: "claimstore.com",
        rawDestinationUrl: "https://claimstore.com",
      },
    });
    storeId = store.id;

    // Create an anonymous click before registration
    clickId = "click_anonymous_777";
    await db.click.create({
      data: {
        id: clickId,
        subId: clickId,
        storeId: store.id,
        ipHash: guestIpHash,
        userId: null, // Anonymous
        rawDestinationUrl: "https://claimstore.com",
        finalUrl: "https://claimstore.com",
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("registers user and automatically claims past anonymous clicks matching guestIpHash", async () => {
    const user = await registerUser({
      email: "newuser_claim@example.com",
      password: "SecurePassword123!",
      name: "Claim Tester",
      guestIpHash,
    });

    expect(user.id).toBeDefined();
    expect(user.role).toBe("user");

    // Verify anonymous click is now claimed by this user
    const claimedClick = await db.click.findUnique({
      where: { id: clickId },
    });

    expect(claimedClick?.userId).toBe(user.id);
  });

  it("authenticates valid login credentials", async () => {
    const loggedIn = await loginUser("newuser_claim@example.com", "SecurePassword123!");
    expect(loggedIn).not.toBeNull();
    expect(loggedIn.email).toBe("newuser_claim@example.com");
  });

  it("rejects invalid password", async () => {
    await expect(
      loginUser("newuser_claim@example.com", "WrongPassword!")
    ).rejects.toThrow(/Invalid email or password/);
  });
});
