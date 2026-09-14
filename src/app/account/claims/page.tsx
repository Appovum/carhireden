// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Account Missing Cashback Claims Queue Page
// Route: /account/claims
// Protected by requireAuthSession server-side guard.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuthSession } from "@/lib/auth/requireAuth";
import { ClaimsClient } from "./ClaimsClient";

export const dynamic = "force-dynamic";

export default async function AccountClaimsPage() {
  const { user } = await requireAuthSession("/account/claims");

  const [userClicks, stores, existingClaims] = await Promise.all([
    db.click.findMany({
      where: { userId: user.id },
      include: { store: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    db.auditLog.findMany({
      where: { userId: user.id, action: "missing_cashback_claim_submitted" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
        <Link href="/account/claims" className="px-3 py-1.5 bg-ink text-paper rounded-[3px] font-medium whitespace-nowrap">
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
            Missing cashback claims
          </h1>
          <p className="font-body text-[14px] text-muted">
            Did a recent purchase miss automated tracking? Select your store click below to submit your claim.
          </p>
        </div>

        <ClaimsClient
          userId={user.id}
          userClicks={userClicks.map((c) => ({
            id: c.id,
            storeId: c.storeId,
            storeName: c.store.name,
            createdAt: c.createdAt.toISOString(),
          }))}
          stores={stores}
          existingClaims={existingClaims.map((c) => {
            const details = c.detailsJson ? JSON.parse(c.detailsJson) : {};
            return {
              id: c.id,
              orderNumber: details.orderNumber || details.orderId || "N/A",
              purchaseAmountMinor: details.purchaseAmountMinor || 0,
              currency: details.currency || "USD",
              status: details.status || "pending_review",
              createdAt: c.createdAt.toISOString(),
            };
          })}
        />
      </section>
    </main>
  );
}
