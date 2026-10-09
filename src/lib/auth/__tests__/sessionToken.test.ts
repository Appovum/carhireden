import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import crypto from "crypto";
import {
  createSessionToken,
  verifySessionToken,
  passwordVersion,
  SESSION_MAX_AGE_SECONDS,
} from "../sessionToken";

const USER = { id: "cmuser0123456789abcdef", passwordHash: "$2a$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234" };
const NOW = 1_800_000_000_000;

function setSecret(value: string) {
  vi.stubEnv("APP_SECRET", value);
  vi.stubEnv("NEXTAUTH_SECRET", "");
  vi.stubEnv("JWT_SECRET", "");
}

describe("session tokens", () => {
  beforeEach(() => setSecret("session-test-secret"));
  afterEach(() => vi.unstubAllEnvs());

  it("creates a token that verifies and carries the user id", async () => {
    const token = await createSessionToken(USER, NOW);
    const claims = await verifySessionToken(token, NOW + 1000);
    expect(claims?.uid).toBe(USER.id);
    expect(claims?.iat).toBe(NOW);
    expect(claims?.exp).toBe(NOW + SESSION_MAX_AGE_SECONDS * 1000);
    expect(claims?.pv).toBe(await passwordVersion(USER.passwordHash));
  });

  it("is a two-part token that does not contain the password hash", async () => {
    const token = await createSessionToken(USER, NOW);
    expect(token.split(".")).toHaveLength(2);
    expect(token).not.toContain(USER.passwordHash);
    const payload = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
    expect(payload).not.toContain(USER.passwordHash);
  });

  it("rejects the old cookie format, which was the bare user id", async () => {
    expect(await verifySessionToken(USER.id, NOW)).toBeNull();
    expect(await verifySessionToken("not-a-real-user-id", NOW)).toBeNull();
    expect(await verifySessionToken("x", NOW)).toBeNull();
  });

  it("rejects empty, oversized and malformed values", async () => {
    expect(await verifySessionToken("", NOW)).toBeNull();
    expect(await verifySessionToken(null, NOW)).toBeNull();
    expect(await verifySessionToken(undefined, NOW)).toBeNull();
    expect(await verifySessionToken("a.b.c", NOW)).toBeNull();
    expect(await verifySessionToken(".", NOW)).toBeNull();
    expect(await verifySessionToken("a".repeat(5000), NOW)).toBeNull();
    expect(await verifySessionToken("%%%.%%%", NOW)).toBeNull();
  });

  it("rejects a token whose payload was changed after signing", async () => {
    const token = await createSessionToken(USER, NOW);
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ uid: "admin-user-id", iat: NOW, exp: NOW + 9e9, pv: "x" }),
      "utf8"
    ).toString("base64url");
    expect(await verifySessionToken(`${forgedPayload}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a token whose signature was changed", async () => {
    const token = await createSessionToken(USER, NOW);
    const [payload, signature] = token.split(".");
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    expect(await verifySessionToken(`${payload}.${flipped}`, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    setSecret("secret-of-another-install");
    const foreign = await createSessionToken(USER, NOW);
    setSecret("session-test-secret");
    expect(await verifySessionToken(foreign, NOW)).toBeNull();
  });

  it("rejects a token that was signed without the session context", async () => {
    // someone who knows the secret but signs the payload the plain way (as a
    // reset token does) must not produce a valid session
    const payload = Buffer.from(
      JSON.stringify({ uid: USER.id, iat: NOW, exp: NOW + 1e9, pv: await passwordVersion(USER.passwordHash) }),
      "utf8"
    ).toString("base64url");
    const plainSignature = crypto.createHmac("sha256", "session-test-secret").update(payload).digest("base64url");
    expect(await verifySessionToken(`${payload}.${plainSignature}`, NOW)).toBeNull();
  });

  it("rejects a token signed with the old public password-reset fallback key", async () => {
    const payload = Buffer.from(
      JSON.stringify({ uid: USER.id, iat: NOW, exp: NOW + 1e9, pv: "x" }),
      "utf8"
    ).toString("base64url");
    const signature = crypto
      .createHmac("sha256", "cp_default_secure_reset_secret_key_2026")
      .update(`couponpilot.session.v1.${payload}`)
      .digest("base64url");
    expect(await verifySessionToken(`${payload}.${signature}`, NOW)).toBeNull();
  });

  it("rejects an expired token and accepts it just before expiry", async () => {
    const token = await createSessionToken(USER, NOW);
    const expiry = NOW + SESSION_MAX_AGE_SECONDS * 1000;
    expect(await verifySessionToken(token, expiry - 1)).not.toBeNull();
    expect(await verifySessionToken(token, expiry)).toBeNull();
    expect(await verifySessionToken(token, expiry + 86_400_000)).toBeNull();
  });

  it("rejects a token issued in the future", async () => {
    const token = await createSessionToken(USER, NOW + 24 * 3_600_000);
    expect(await verifySessionToken(token, NOW)).toBeNull();
  });

  it("changes the password fingerprint when the password changes", async () => {
    const a = await passwordVersion("$2a$12$first");
    const b = await passwordVersion("$2a$12$second");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await passwordVersion(null)).toBe(await passwordVersion(undefined));
  });

  it("refuses to sign or verify anything when no secret is configured", async () => {
    const token = await createSessionToken(USER, NOW);
    vi.stubEnv("APP_SECRET", "");
    await expect(createSessionToken(USER, NOW)).rejects.toThrow(/APP_SECRET/);
    await expect(verifySessionToken(token, NOW)).rejects.toThrow(/APP_SECRET/);
  });
});
