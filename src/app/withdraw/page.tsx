// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Interactive Wallet Withdrawal Page
// Route: /withdraw
// Protected by requireAuthSession server-side guard.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { requireAuthSession } from "@/lib/auth/requireAuth";
import { WithdrawClient } from "./WithdrawClient";

export const dynamic = "force-dynamic";

export default async function WithdrawPage() {
  const { user, balance } = await requireAuthSession("/withdraw");

  const pendingWithdrawal = await db.withdrawal.findFirst({
    where: { userId: user.id, status: "requested" },
  });

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display font-bold text-[24px] sm:text-[30px] text-ink">
          Withdraw cashback
        </h1>
        <p className="font-body text-[14px] text-muted">
          Transfer your confirmed ready-to-withdraw earnings directly to your account
        </p>
      </div>

      <section className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
        <WithdrawClient
          userId={user.id}
          userEmail={user.email}
          confirmedBalance={balance}
          hasPendingWithdrawal={!!pendingWithdrawal}
        />
      </section>
    </main>
  );
}
