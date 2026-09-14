import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { POST } from "../signup/route";

describe("Signup API & Anonymous Click Claiming", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("registers user and claims guest clicks associated with IP hash", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "new_signup_user@example.com",
        password: "SecretPassword123!",
        name: "New Signup User",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("new_signup_user@example.com");

    const user = await db.user.findUnique({
      where: { email: "new_signup_user@example.com" },
    });
    expect(user).not.toBeNull();
  });
});
