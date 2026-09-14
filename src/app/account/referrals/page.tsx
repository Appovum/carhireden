// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Account Referrals & Bonuses Page
// Route: /account/referrals
// Protected by requireAuthSession server-side guard.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuthSession } from "@/lib/auth/requireAuth";
import { ReferralsClient } from "./ReferralsClient";

export const dynamic = "force-dynamic";

export default async function AccountReferralsPage() {
  const { user } = await requireAuthSession("/account/referrals");

  const [referredUsers, referrer] = await Promise.all([
    db.user.findMany({
      where: { referredById: user.id },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    user.referredById
      ? db.user.findUnique({
          where: { id: user.referredById },
          select: { id: true, email: true, name: true, referralCode: true },
        })
      : null,
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://couponpilot.com";
  const refCode = user.referralCode || user.id.slice(-8);
  const refLink = `${baseUrl}/signup?ref=${refCode}`;

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation Sub-Header */}
      <nav className="flex items-center gap-1 border-b border-rule pb-3 overflow-x-auto text-[13px] font-body">
        <Link href="/account" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Profile Settings
        </Link>
        <Link href="/account/referrals" className="px-3 py-1.5 bg-ink text-paper rounded-[3px] font-medium whitespace-nowrap">
          Referrals & Bonuses
        </Link>
        <Link href="/account/claims" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Missing Cashback Claims
        </Link>
        <Link href="/account/alerts" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Deal Alerts
        </Link>
        <Link
          href="/withdraw"
          className="px-3.5 py-1.5 bg-ink text-paper font-medium rounded-[3px] text-[13px] hover:bg-ink/90 transition-colors whitespace-nowrap ml-auto"
        >
          Withdraw earnings
        </Link>
      </nav>

      <section className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-ink">
            Referrals & Bonus Cash
          </h1>
          <p className="font-body text-[14px] text-muted">
            Invite friends to CouponPilot using your personal link and earn bonus cashback when they complete their first purchase!
          </p>
        </div>

        <ReferralsClient userId={user.id} refLink={refLink} referredUsers={referredUsers} referrer={referrer} />
      </section>
    </main>
  );
}
