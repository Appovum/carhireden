// ═══════════════════════════════════════════════════════════════════
// Wallet Page — /wallet
// Protected server component querying user-specific ledger balances & transactions.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fromMinorUnits } from "@/lib/money";
import type { CashbackTransaction, WalletBalance } from "@/types";
import { WalletPageClient } from "@/components/WalletPageClient";
import { requireAuthSession } from "@/lib/auth/requireAuth";

export const dynamic = "force-dynamic";

function formatDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default async function WalletPage() {
  const { user } = await requireAuthSession("/wallet");

  const [dbConversions, dbWithdrawals, dbWalletEntries] = await Promise.all([
    db.conversion.findMany({
      where: {
        click: { userId: user.id },
      },
      include: { store: true },
      orderBy: { createdAt: "desc" },
    }),
    db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.walletEntry.findMany({
      where: { userId: user.id },
      include: { conversion: { include: { store: true } }, withdrawal: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 1. Calculate Gross Confirmed Cashback Earnings
  let grossConfirmedMinor = 0;
  let grossPendingMinor = 0;

  // Add conversions
  dbConversions.forEach((c: any) => {
    if (c.status === "confirmed" || c.status === "paid") {
      grossConfirmedMinor += c.cashbackMinor;
    } else if (c.status === "pending") {
      grossPendingMinor += c.cashbackMinor;
    }
  });

  // Add positive wallet entries not linked to conversions
  dbWalletEntries.forEach((we: any) => {
    if (!we.conversionId && !we.withdrawalId && we.amountMinor > 0) {
      if (we.bucket === "confirmed") {
        grossConfirmedMinor += we.amountMinor;
      } else if (we.bucket === "pending") {
        grossPendingMinor += we.amountMinor;
      }
    }
  });

  // 2. Calculate Total Paid Out and Pending Withdrawals
  let totalPaidOutMinor = 0;
  let pendingRequestedWithdrawalMinor = 0;

  dbWithdrawals.forEach((w: any) => {
    if (w.status === "paid") {
      totalPaidOutMinor += w.amountMinor;
    } else if (w.status === "requested") {
      pendingRequestedWithdrawalMinor += w.amountMinor;
    }
  });

  // 3. Derive Net Available Balance and Total Earned All-Time
  const pending = fromMinorUnits({ amountMinor: grossPendingMinor, currency: "USD" });
  const paid = fromMinorUnits({ amountMinor: totalPaidOutMinor, currency: "USD" });
  const requestedWithdrawal = fromMinorUnits({ amountMinor: pendingRequestedWithdrawalMinor, currency: "USD" });
  const grossConfirmed = fromMinorUnits({ amountMinor: grossConfirmedMinor, currency: "USD" });

  // Confirmed balance available = Gross Confirmed Earnings minus Paid/Requested Withdrawals
  const confirmed = Math.max(0, grossConfirmed - (paid + requestedWithdrawal));

  // Total Earned = Total Gross Cashback Earned Across All Time (Pending + Gross Confirmed)
  const total = pending + grossConfirmed;

  const wallet: WalletBalance = {
    pending,
    confirmed,
    paid,
    total,
  };

  const hasPendingWithdrawal = dbWithdrawals.some((w: any) => w.status === "requested");

  // Build unified transaction list from DB
  const rawTxList: {
    id: string;
    storeName: string;
    storeLogo: string;
    amount: number;
    isWithdrawal: boolean;
    status: "pending" | "confirmed" | "paid";
    purchaseDate: string;
    createdAtTimestamp: number;
  }[] = [];

  // Add conversions from DB
  dbConversions.forEach((c: any) => {
    rawTxList.push({
      id: c.id,
      storeName: c.store ? c.store.name : "Merchandise Cashback",
      storeLogo: c.store?.logoUrl || "",
      amount: fromMinorUnits({ amountMinor: c.cashbackMinor, currency: c.currency }),
      isWithdrawal: false,
      status: (c.status === "paid" ? "paid" : c.status === "confirmed" ? "confirmed" : "pending") as any,
      purchaseDate: formatDate(c.transactionDate || c.createdAt),
      createdAtTimestamp: new Date(c.createdAt).getTime(),
    });
  });

  // Add withdrawals from DB
  dbWithdrawals.forEach((w: any) => {
    rawTxList.push({
      id: w.id,
      storeName: `Payout Withdrawal (${w.payoutMethod || "PayPal"})`,
      storeLogo: "",
      amount: fromMinorUnits({ amountMinor: w.amountMinor, currency: w.currency }),
      isWithdrawal: true,
      status: w.status === "paid" ? "paid" : "pending",
      purchaseDate: formatDate(w.createdAt),
      createdAtTimestamp: new Date(w.createdAt).getTime(),
    });
  });

  // Add wallet entries that are not redundant
  dbWalletEntries.forEach((we: any) => {
    if (!rawTxList.some((t) => t.id === we.conversionId || t.id === we.withdrawalId)) {
      const isW = we.type === "withdrawal_requested" || we.type === "withdrawal_approved";
      const storeName = we.conversion?.store?.name || we.description || "Wallet Adjustment";
      const statusStr: "pending" | "confirmed" | "paid" =
        we.bucket === "paid" ? "paid" : we.bucket === "confirmed" ? "confirmed" : "pending";

      rawTxList.push({
        id: we.id,
        storeName,
        storeLogo: we.conversion?.store?.logoUrl || "",
        amount: Math.abs(fromMinorUnits({ amountMinor: we.amountMinor, currency: we.currency })),
        isWithdrawal: isW,
        status: statusStr,
        purchaseDate: formatDate(we.createdAt),
        createdAtTimestamp: new Date(we.createdAt).getTime(),
      });
    }
  });

  // Sort descending by date
  rawTxList.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);

  const transactions: (CashbackTransaction & { isWithdrawal?: boolean })[] = rawTxList.map((t) => ({
    id: t.id,
    storeName: t.storeName,
    storeLogo: t.storeLogo,
    amount: t.amount,
    isWithdrawal: t.isWithdrawal,
    status: t.status,
    purchaseDate: t.purchaseDate,
  }));

  return (
    <WalletPageClient
      wallet={wallet}
      transactions={transactions}
      hasPendingWithdrawal={hasPendingWithdrawal}
    />
  );
}
