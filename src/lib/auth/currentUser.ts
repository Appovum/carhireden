// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Current user
//
// The single answer to "who is making this request?". A request is signed in
// only if its cp_session cookie holds a genuine, unexpired token (see
// sessionToken.ts) AND the user it names still exists AND their password has
// not changed since the token was issued. Anything else is "nobody".
// ═══════════════════════════════════════════════════════════════════

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, passwordVersion, verifySessionToken } from "./sessionToken";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  referralCode: string | null;
  referredById: string | null;
  createdAt: Date;
}

/** Resolves a raw cookie value to a user, or null. Never throws. */
export async function getSessionUserFromToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  let claims;
  try {
    claims = await verifySessionToken(token);
  } catch (err) {
    // APP_SECRET is not configured: nobody can be signed in. Say why in the log.
    console.error("[AUTH] Cannot verify sessions:", err instanceof Error ? err.message : err);
    return null;
  }
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      referralCode: true,
      referredById: true,
      createdAt: true,
      passwordHash: true,
    },
  });
  if (!user) return null;

  // A password change ends every session issued before it.
  if (claims.pv !== (await passwordVersion(user.passwordHash))) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    referralCode: user.referralCode,
    referredById: user.referredById,
    createdAt: user.createdAt,
  };
}

/** The signed-in user for the current request (route handlers and server components). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUserFromToken(store.get(SESSION_COOKIE)?.value);
}
