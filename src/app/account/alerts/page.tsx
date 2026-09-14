// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Account Deal Alerts Subscription Manager
// Route: /account/alerts
// Protected by requireAuthSession server-side guard.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuthSession } from "@/lib/auth/requireAuth";
import { AlertsClient } from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AccountAlertsPage() {
  const { user } = await requireAuthSession("/account/alerts");

  const subscriptions = await db.alert.findMany({
    where: {
      OR: [
        { userId: user.id },
        { email: user.email },
      ],
      isEnabled: true,
    },
    include: { store: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation Sub-Header */}
      <nav className="flex items-center gap-1 border-b border-rule pb-3 overflow-x-auto text-[13px] font-body">
        <Link href="/account" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Profile Settings
        </Link>
        <Link href="/account/referrals" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Referrals & Bonuses
        </Link>
        <Link href="/account/claims" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
          Missing Cashback Claims
        </Link>
        <Link href="/account/alerts" className="px-3 py-1.5 bg-ink text-paper rounded-[3px] font-medium whitespace-nowrap">
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
            Deal Alerts & Store Notifications
          </h1>
          <p className="font-body text-[14px] text-muted">
            Subscribe to instant alerts when your favorite merchants publish new promo codes or high cashback rates.
          </p>
        </div>

        <AlertsClient
          userId={user.id}
          initialSubscriptions={subscriptions.map((s) => ({
            id: s.id,
            keyword: s.targetDiscount || s.store?.name || "Deal Alert",
            storeName: s.store?.name,
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      </section>
    </main>
  );
}
