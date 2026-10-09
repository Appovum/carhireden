// ═══════════════════════════════════════════════════════════════════
// CouponPilot — API route guards
//
// Every API route that changes or reveals anything private starts with one of
// these. They answer from the signed session (see currentUser.ts), never from
// anything the caller put in the request body or URL.
//
//   const auth = await requireAdminApi();
//   if (!auth.ok) return auth.response;
//   // auth.user is the signed-in administrator
//
// src/lib/auth/__tests__/routeGuards.test.ts fails the build if an admin or
// account route is added without one.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./currentUser";

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

function unauthorized(): AuthResult {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "Unauthorized: Authentication required." },
      { status: 401 }
    ),
  };
}

function forbidden(): AuthResult {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "Forbidden: administrator access required." },
      { status: 403 }
    ),
  };
}

/** Any signed-in user. 401 otherwise. */
export async function requireUserApi(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return { ok: true, user };
}

/** A signed-in administrator. 401 when signed out, 403 for a normal user. */
export async function requireAdminApi(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return { ok: true, user };
}
