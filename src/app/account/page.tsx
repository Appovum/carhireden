// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Account Settings Page
// Route: /account
// Protected by requireAuthSession server-side guard.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/requireAuth";
import { AccountFormClient } from "./AccountFormClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, balance } = await requireAuthSession("/account");

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Sub-navigation */}
      <nav className="flex items-center gap-1 border-b border-rule pb-3 overflow-x-auto text-[13px] font-body">
        <Link href="/account" className="px-3 py-1.5 bg-ink text-paper rounded-[3px] font-medium whitespace-nowrap">
          Profile Settings
        </Link>
        <Link href="/account/referrals" className="px-3 py-1.5 text-muted hover:text-ink hover:bg-paper-sunken rounded-[3px] transition-colors whitespace-nowrap">
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
          <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-ink flex items-center gap-2">
            <span>Account Settings</span>
            {user.role === "admin" && (
              <span className="text-[11px] font-mono px-2 py-0.5 bg-paper-sunken border border-rule rounded text-muted uppercase">
                Admin
              </span>
            )}
          </h1>
          <p className="font-body text-[14px] text-muted">
            Logged in as {user.email}
          </p>
        </div>

        <AccountFormClient user={user} />
      </section>
    </main>
  );
}
