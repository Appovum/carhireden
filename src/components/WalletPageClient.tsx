// ═══════════════════════════════════════════════════════════════════
// WalletPageClient — Client component for /wallet
// Preserves layout, balance cards, withdrawal CTA link to /withdraw, filters, and rows.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import type { CashbackTransaction, WalletBalance } from "@/types";

import { useSiteSettings } from "@/hooks";

interface ExtendedTransaction extends CashbackTransaction {
  isWithdrawal?: boolean;
}

interface WalletPageClientProps {
  wallet: WalletBalance;
  transactions: ExtendedTransaction[];
  hasPendingWithdrawal?: boolean;
}

export function WalletPageClient({ wallet, transactions, hasPendingWithdrawal = false }: WalletPageClientProps) {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "confirmed" | "paid">("all");

  const filtered = activeFilter === "all"
    ? transactions
    : transactions.filter((t) => t.status === activeFilter);

  return (
    <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-6 sm:py-8 overflow-x-hidden box-border">
      {/* Balance card */}
      <section className="bg-paper-raised border border-rule rounded-[4px] p-5 sm:p-6 mb-6">
        <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-ink mb-4">
          Your cashback
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <BalanceItem label="Total earned" amount={wallet.total} currency={default_currency} exchangeRate={currency_exchange_rate} highlight />
          <BalanceItem label="Pending" amount={wallet.pending} currency={default_currency} exchangeRate={currency_exchange_rate} />
          <BalanceItem label="Confirmed" amount={wallet.confirmed} currency={default_currency} exchangeRate={currency_exchange_rate} />
          <BalanceItem label="Paid out" amount={wallet.paid} currency={default_currency} exchangeRate={currency_exchange_rate} />
        </div>

        {/* Explanation */}
        <p className="text-[13px] font-body text-muted mt-4 pt-4 border-t border-rule">
          Cashback starts as &ldquo;pending&rdquo; after your purchase. Merchants usually confirm within 30–90 days — the timing is on their end, not ours. Once confirmed, you can withdraw it.
        </p>

        {/* Withdraw CTA (Links to dedicated /withdraw form) */}
        <div className="mt-4 flex items-center gap-3">
          {hasPendingWithdrawal ? (
            <span className="px-5 py-2.5 text-[14px] font-body font-medium bg-paper-sunken border border-rule text-muted rounded-[3px]">
              Withdrawal Requested (Pending Admin Review)
            </span>
          ) : wallet.confirmed > 0 ? (
            <Link
              href="/withdraw"
              className="px-5 py-2.5 text-[14px] font-body font-medium bg-money text-white rounded-[3px] hover:bg-money/90 active:bg-money/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring inline-block"
            >
              Withdraw {formatCurrency(wallet.confirmed)} →
            </Link>
          ) : (
            <span className="text-[13px] font-body text-muted">
              Minimum $10.00 confirmed balance required to withdraw.
            </span>
          )}
        </div>
      </section>

      {/* Timeline heading + filters */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-[18px] text-ink">
          Transaction history
        </h2>

        <div className="flex gap-1">
          {(["all", "pending", "confirmed", "paid"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-[12px] font-body font-medium rounded-[2px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                activeFilter === filter
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink hover:bg-paper-sunken"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2">
        {filtered.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[14px] font-body text-muted py-8">
          No {activeFilter} transactions yet.
        </p>
      )}
    </main>
  );
}

function BalanceItem({
  label,
  amount,
  currency = "USD",
  exchangeRate = 1,
  highlight,
}: {
  label: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-paper-sunken border border-rule/60 rounded-[3px] p-3">
      <div className="text-[12px] font-body text-muted">{label}</div>
      <div
        className={`font-display font-bold text-[20px] sm:text-[22px] tabular-nums mt-0.5 ${
          highlight ? "text-money" : "text-ink"
        }`}
      >
        {formatCurrency(amount, currency, exchangeRate)}
      </div>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: ExtendedTransaction }) {
  const isWithdrawal = transaction.isWithdrawal || transaction.storeName.toLowerCase().includes("withdrawal");
  const isPending = transaction.status === "pending";
  const isConfirmed = transaction.status === "confirmed";

  return (
    <div className="flex items-center justify-between p-3.5 bg-paper-raised border border-rule rounded-[3px]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[3px] bg-paper-sunken border border-rule flex items-center justify-center font-display font-bold text-ink text-sm">
          {isWithdrawal ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          ) : transaction.storeLogo ? (
            <img src={transaction.storeLogo} alt={transaction.storeName} className="w-5 h-5 object-contain" />
          ) : (
            transaction.storeName.slice(0, 1)
          )}
        </div>
        <div>
          <div className="font-body font-medium text-[14px] text-ink">{transaction.storeName}</div>
          <div className="text-[12px] font-body text-muted">{transaction.purchaseDate}</div>
        </div>
      </div>

      <div className="text-right">
        <div
          className={`font-display font-bold text-[15px] tabular-nums ${
            isWithdrawal ? "text-ink" : "text-money"
          }`}
        >
          {isWithdrawal ? `-${formatCurrency(transaction.amount)}` : `+${formatCurrency(transaction.amount)}`}
        </div>
        <span
          className={`inline-block text-[11px] font-body font-medium rounded-[2px] px-1.5 py-0.5 mt-0.5 ${
            isWithdrawal
              ? "bg-paper-sunken text-muted border border-rule"
              : isPending
              ? "bg-paper-sunken text-muted border border-rule"
              : isConfirmed
              ? "bg-money/10 text-money border border-money/20"
              : "bg-ink/10 text-ink border border-ink/20"
          }`}
        >
          {isWithdrawal ? "payout" : transaction.status}
        </span>
      </div>
    </div>
  );
}
