// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Server-Side Auth Guard & Session Resolver
// Redirects unauthenticated requests to /login?next=...
// ═══════════════════════════════════════════════════════════════════

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserWalletBalance } from "@/lib/ledger/balance";

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    referralCode?: string | null;
    referredById?: string | null;
    createdAt: Date;
  };
  balance: number;
}

export async function requireAuthSession(nextPath: string = "/account"): Promise<AuthenticatedSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cp_session")?.value;

  if (!sessionCookie) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const user = await db.user.findUnique({
    where: { id: sessionCookie },
    select: { id: true, email: true, name: true, role: true, referralCode: true, referredById: true, createdAt: true },
  });

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
