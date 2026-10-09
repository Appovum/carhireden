// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Signed session tokens
//
// The cp_session cookie used to hold the bare user id, which anyone could
// type into their browser to be that user. It now holds a token that only
// this server can produce:
//
//     <base64url payload>.<base64url HMAC-SHA256 signature>
//
// The payload carries the user id, an issue and an expiry time, and a short
// fingerprint of the user's current password hash. Changing the password
// therefore signs out every other session for that account.
//
// Uses Web Crypto only, so the same code runs in route handlers and in
// middleware. The signing key is APP_SECRET (see security/appSecret.ts) with
// a context string mixed in, so a password-reset token or any other value
// signed with the same secret can never be accepted as a session.
// ═══════════════════════════════════════════════════════════════════

import { getAppSecret } from "@/lib/security/appSecret";

export const SESSION_COOKIE = "cp_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const CONTEXT = "couponpilot.session.v1";
const MAX_TOKEN_LENGTH = 2048;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface SessionClaims {
  /** User id. */
  uid: string;
  /** Issued at, ms since epoch. */
  iat: number;
  /** Expires at, ms since epoch. */
  exp: number;
  /** Fingerprint of the password hash the session was issued against. */
  pv: string;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getAppSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

/**
 * Short fingerprint of a password hash. It changes whenever the password
 * changes, which is what ends the old sessions. Users without a password
 * (no hash) share a constant value.
 */
export async function passwordVersion(passwordHash: string | null | undefined): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${CONTEXT}.pv.${passwordHash ?? ""}`));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Creates a session token for a user. Throws if APP_SECRET is not configured. */
export async function createSessionToken(
  user: { id: string; passwordHash: string | null },
  now: number = Date.now()
): Promise<string> {
  const claims: SessionClaims = {
    uid: user.id,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
    pv: await passwordVersion(user.passwordHash),
  };
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const key = await hmacKey("sign");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${CONTEXT}.${payload}`));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the token's claims, or null when it is malformed, forged, signed
 * with another secret, or expired. Throws only if APP_SECRET is not
 * configured, so a misconfigured server cannot silently accept sessions.
 *
 * This proves the token is genuine. Callers still look the user up, because a
 * genuine token can belong to a user who has since been deleted or whose
 * password has changed.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  now: number = Date.now()
): Promise<SessionClaims | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const signature = fromBase64Url(parts[1]);
  if (!signature || signature.length !== 32) return null;

  const key = await hmacKey("verify");
  // crypto.subtle.verify compares in constant time
  const genuine = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(`${CONTEXT}.${parts[0]}`));
  if (!genuine) return null;

  const payloadBytes = fromBase64Url(parts[0]);
  if (!payloadBytes) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }

  if (!claims || typeof claims !== "object") return null;
  const { uid, iat, exp, pv } = claims as Record<string, unknown>;
  if (typeof uid !== "string" || !uid || typeof pv !== "string") return null;
  if (typeof iat !== "number" || typeof exp !== "number") return null;
  if (exp <= now) return null;
  if (iat > now + CLOCK_SKEW_MS) return null;

  return { uid, iat, exp, pv };
}
