import { describe, it, expect, vi } from "vitest";
import { createPasswordResetToken, verifyPasswordResetToken } from "../passwordReset";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Password Reset Token System", () => {
  const mockUser = {
    id: "usr_test_123",
    email: "user@example.com",
    name: "Test User",
    passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E.5A/rW648aB.V3.eE6h9.K1i.K",
  };

  it("generates a valid reset token and verifies it successfully", async () => {
    (db.user.findUnique as any).mockResolvedValue(mockUser);

    const token = createPasswordResetToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const result = await verifyPasswordResetToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.user.id).toBe("usr_test_123");
      expect(result.user.email).toBe("user@example.com");
    }
  });

  it("rejects malformed or invalid tokens", async () => {
    const invalidResult = await verifyPasswordResetToken("invalid.token.structure");
    expect(invalidResult.valid).toBe(false);
    if (!invalidResult.valid) {
      expect(invalidResult.error).toMatch(/Malformed|Invalid/);
    }
  });

  it("invalidates token once the password hash is updated in database", async () => {
    const token = createPasswordResetToken(mockUser);

    // Simulate database returning updated user with new password hash
    const mockUserUpdated = {
      ...mockUser,
      passwordHash: "$2a$12$NEW_DIFFERENT_HASH_VALUE_HERE",
    };
    (db.user.findUnique as any).mockResolvedValue(mockUserUpdated);

    const resultAfter = await verifyPasswordResetToken(token);
    expect(resultAfter.valid).toBe(false);
    if (!resultAfter.valid) {
      expect(resultAfter.error).toMatch(/already been used or invalidated/);
    }
  });
});
