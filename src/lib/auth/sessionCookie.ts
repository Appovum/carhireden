// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Session cookie helpers
// ═══════════════════════════════════════════════════════════════════

import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./sessionToken";

/** True when the visitor reached us over HTTPS (directly or through a proxy). */
function isHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

/**
 * Sets the session cookie. It is marked Secure whenever the site is served
 * over HTTPS, but not over plain HTTP: a Secure cookie would never be stored,
 * which would make sign-in impossible on a test install reached by IP address.
 */
export function setSessionCookie(response: NextResponse, token: string, request: Request): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: isHttps(request),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
}
