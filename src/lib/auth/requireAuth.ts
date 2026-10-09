// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Server-Side Auth Guard & Session Resolver
// Redirects unauthenticated requests to /login?next=...
// ═══════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/currentUser";
import { getUserWalletBalance } from "@/lib/ledger/balance";

export interface AuthenticatedSession {
  user: SessionUser;
  balance: number;
}

export async function requireAuthSession(nextPath: string = "/account"): Promise<AuthenticatedSession> {
  // Signed-in means a genuine, unexpired session token for a user who still
  // exists (see lib/auth/currentUser.ts). A bare user id in the cookie is not.
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const balanceObj = await getUserWalletBalance(user.id);
  const balance = balanceObj.confirmedMinor / 100;

  return {
    user,
    balance,
  };
}

export async function requireAdminSession(nextPath: string = "/admin"): Promise<AuthenticatedSession> {
  const session = await requireAuthSession(nextPath);
  if (session.user.role !== "admin") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
