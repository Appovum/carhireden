import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../crypto";

describe("AES-256-GCM Encryption at Rest", () => {
  it("encrypts and decrypts secret strings symmetrically", () => {
    const original = "awin_api_key_secret_123456789";
    const encrypted = encryptSecret(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted.split(":").length).toBe(3); // IV:AuthTag:Ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it("handles empty or blank input gracefully", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });
});
