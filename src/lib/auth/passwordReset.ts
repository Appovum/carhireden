// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Password Reset Token Utility
// Generates & verifies secure HMAC-SHA256 tokens for password reset.
// ═══════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { db } from "@/lib/db";

const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

function getSecretKey(): string {
  return (
    process.env.APP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "cp_default_secure_reset_secret_key_2026"
  );
}

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
  pwdHashSnippet: string;
}

/**
 * Creates a signed password reset token for a user.
 */
export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string | null }): string {
  const exp = Date.now() + TOKEN_EXPIRATION_MS;
  const pwdHashSnippet = (user.passwordHash || "").slice(0, 16);
  
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    exp,
    pwdHashSnippet,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr, "utf8").toString("base64url");

  const secret = getSecretKey();
  const hmac = crypto.createHmac("sha256", secret).update(payloadBase64).digest("hex");

  return `${payloadBase64}.${hmac}`;
}

export type VerifyResult =
  | { valid: true; user: { id: string; email: string; name: string | null } }
  | { valid: false; error: string };

/**
 * Verifies a password reset token and returns the corresponding user if valid.
 */
export async function verifyPasswordResetToken(token: string): Promise<VerifyResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing reset token." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed reset token." };
  }

  const [payloadBase64, hmacHex] = parts;

  // 1. Verify HMAC signature
  const secret = getSecretKey();
  const expectedHmac = crypto.createHmac("sha256", secret).update(payloadBase64).digest("hex");
  
  const hmacBuffer = Buffer.from(hmacHex, "hex");
  const expectedBuffer = Buffer.from(expectedHmac, "hex");

  if (hmacBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(hmacBuffer, expectedBuffer)) {
    return { valid: false, error: "Invalid password reset signature." };
  }

  // 2. Decode payload
  let payload: TokenPayload;
  try {
    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: "Invalid password reset token format." };
  }

  // 3. Check expiration
  if (Date.now() > payload.exp) {
    return { valid: false, error: "Password reset link has expired. Please request a new one." };
  }

  // 4. Fetch user from DB
  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    return { valid: false, error: "User account not found." };
  }

  // 5. Verify password hash snippet matches (prevents token re-use once password changed)
  const currentSnippet = (user.passwordHash || "").slice(0, 16);
  if (currentSnippet !== payload.pwdHashSnippet) {
    return { valid: false, error: "Password reset link has already been used or invalidated." };
  }

  return {
    valid: true,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
