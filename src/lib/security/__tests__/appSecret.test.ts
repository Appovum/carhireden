import { describe, it, expect, afterEach, vi } from "vitest";
import { getAppSecret } from "../appSecret";
import { encryptSecret, decryptSecret } from "../crypto";

function clearSecrets() {
  vi.stubEnv("APP_SECRET", "");
  vi.stubEnv("NEXTAUTH_SECRET", "");
  vi.stubEnv("JWT_SECRET", "");
}

describe("getAppSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns APP_SECRET when it is set", () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "secret-from-app-secret");
    expect(getAppSecret()).toBe("secret-from-app-secret");
  });

  it("prefers APP_SECRET over the legacy names", () => {
    vi.stubEnv("APP_SECRET", "primary");
    vi.stubEnv("NEXTAUTH_SECRET", "legacy-nextauth");
    vi.stubEnv("JWT_SECRET", "legacy-jwt");
    expect(getAppSecret()).toBe("primary");
  });

  it("falls back to NEXTAUTH_SECRET, then JWT_SECRET, for existing installs", () => {
    clearSecrets();
    vi.stubEnv("NEXTAUTH_SECRET", "legacy-nextauth");
    vi.stubEnv("JWT_SECRET", "legacy-jwt");
    expect(getAppSecret()).toBe("legacy-nextauth");

    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(getAppSecret()).toBe("legacy-jwt");
  });

  it("throws when no secret is configured, instead of using a built-in default", () => {
    clearSecrets();
    expect(() => getAppSecret()).toThrow(/APP_SECRET environment variable is not configured/);
  });

  it("treats an empty string as not configured", () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "");
    expect(() => getAppSecret()).toThrow();
  });

  it("makes encryption at rest fail without a secret rather than weakening it", () => {
    clearSecrets();
    expect(() => encryptSecret("sensitive")).toThrow(/APP_SECRET/);
    expect(() => decryptSecret("aa:bb:cc")).toThrow(/APP_SECRET/);
  });

  it("still encrypts and decrypts when a secret is set", () => {
    clearSecrets();
    vi.stubEnv("APP_SECRET", "a-real-test-secret");
    expect(decryptSecret(encryptSecret("sensitive value"))).toBe("sensitive value");
  });
});
