// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Encryption at Rest (AES-256-GCM)
// Encrypts sensitive credentials, payout details, and API keys.
// ═══════════════════════════════════════════════════════════════════

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

function getMasterKey(): Buffer {
  const secret = process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[SECURITY CRITICAL] APP_SECRET environment variable is not configured.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string into IV:AuthTag:Ciphertext format.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string back into plaintext.
 */
export function decryptSecret(encryptedStr: string): string {
  if (!encryptedStr) return "";
  
  // If string is already plain JSON, return directly as-is
  const trimmed = encryptedStr.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return encryptedStr;
  }

  const parts = encryptedStr.split(":");
  if (parts.length !== 3) {
    // If not encrypted format, return as-is for backward compatibility
    return encryptedStr;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
