import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";
import { createPasswordResetToken, verifyPasswordResetToken } from "../passwordReset";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// The string that used to be built into the code as the signing key when no
// secret was configured. It is public (it shipped to every buyer).
const OLD_PUBLIC_FALLBACK = "cp_default_secure_reset_secret_key_2026";

const user = {
  id: "usr_test_123",
  email: "user@example.com",
  name: "Test User",
  passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E.5A/rW648aB.V3.eE6h9.K1i.K",
};

function clearSecrets() {
  vi.stubEnv("APP_SECRET", "");
  vi.stubEnv("NEXTAUTH_SECRET", "");
  vi.stubEnv("JWT_SECRET", "");
}

/** Builds a token the way the app does, but signed with a key the attacker chooses. */
function forgeToken(signingKey: string, overrides: Record<string, unknown> = {}) {
  const payload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + 60 * 60 * 1000,
    pwdHashSnippet: user.passwordHash.slice(0, 16),
    ...overrides,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", signingKey).update(body).digest("hex");
  return `${body}.${signature}`;
}

describe("password reset secret handling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("refuses to create a reset token when no secret is configured", () => {
    clearSecrets();
    expect(() => createPasswordResetToken(user)).toThrow(/APP_SECRET/);
  });

  it("refuses to verify a reset token when no secret is configured", async () => {
    clearSecrets();
    const token = forgeToken(OLD_PUBLIC_FALLBACK);
    await expect(verifyPasswordResetToken(token)).rejects.toThrow(/APP_SECRET/);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token signed with the old public fallback key when a real secret is set", async () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "this-install-has-its-own-secret");

    const forged = forgeToken(OLD_PUBLIC_FALLBACK);
    const result = await verifyPasswordResetToken(forged);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/signature/i);
    // the signature check runs before any database lookup
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token signed with a different install's secret", async () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "secret-of-install-a");
    const tokenFromB = forgeToken("secret-of-install-b");

    const result = await verifyPasswordResetToken(tokenFromB);
    expect(result.valid).toBe(false);
  });

  it("rejects a valid token whose payload was altered after signing", async () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "this-install-has-its-own-secret");
    const token = createPasswordResetToken(user);
    const [, signature] = token.split(".");
    const tamperedBody = Buffer.from(
      JSON.stringify({ userId: "someone-else", email: "victim@example.com", exp: Date.now() + 3_600_000, pwdHashSnippet: "" }),
      "utf8"
    ).toString("base64url");

    const result = await verifyPasswordResetToken(`${tamperedBody}.${signature}`);
    expect(result.valid).toBe(false);
  });

  it("accepts a token it created itself when a secret is configured", async () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "this-install-has-its-own-secret");
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    const result = await verifyPasswordResetToken(createPasswordResetToken(user));
    expect(result.valid).toBe(true);
  });

  it("invalidates a token when the secret is rotated", async () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "old-secret");
    const token = createPasswordResetToken(user);

    vi.stubEnv("APP_SECRET", "new-secret");
    const result = await verifyPasswordResetToken(token);
    expect(result.valid).toBe(false);
  });
});
