// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Withdrawals Payout Queue
// Route: /admin/withdrawals
// Real dynamic database fetching from Prisma via /api/admin/withdrawals.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef, BulkAction } from "@/components/admin/AdminTable";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

interface WithdrawalRow {
  id: string;
  userEmail: string;
  userBalanceAtRequestMinor: number;
  amountMinor: number;
  payoutMethod: string;
  payoutTarget: string;
  status: "requested" | "approved" | "paid" | "rejected";
  createdAt: string;
}

export default function AdminWithdrawalsPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/withdrawals?status=all");
      const data = await res.json();
      if (data.withdrawals) {
        setWithdrawals(
          data.withdrawals.map((w: any) => ({
            id: w.id,
            userEmail: w.user ? w.user.email : "Shopper Account",
            userBalanceAtRequestMinor: w.user ? (w.user.confirmedBalanceMinor || w.amountMinor) : w.amountMinor,
            amountMinor: w.amountMinor,
            payoutMethod: w.payoutMethod || "PAYPAL",
            payoutTarget: w.payoutDetailsEncrypted || w.payoutTarget || (w.user ? w.user.email : "PayPal Account"),
            status: w.status,
            createdAt: w.createdAt.slice(0, 10),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load withdrawals from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleMarkPaid = async (selected: WithdrawalRow[]) => {
    for (const item of selected) {
      await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: item.id, action: "approve" }),
      });
    }
    fetchWithdrawals();
  };

  const bulkActions: BulkAction<WithdrawalRow>[] = [
    { label: "Mark paid & release payout", onClick: handleMarkPaid },
  ];

  const columns: ColumnDef<WithdrawalRow>[] = [
    { key: "userEmail", header: "Shopper email", sortable: true },
    {
      key: "userBalanceAtRequestMinor",
      header: "Balance at request",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.userBalanceAtRequestMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "amountMinor",
      header: "Requested amount",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.amountMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
    { key: "payoutMethod", header: "Channel", sortable: true },
    { key: "payoutTarget", header: "Target account", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
            r.status === "paid"
              ? "bg-money/10 border-money/20 text-money"
              : r.status === "requested"
              ? "bg-paper-sunken border-rule text-ink font-medium"
              : "bg-urgent/10 border-urgent/20 text-urgent"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "createdAt", header: "Requested date", sortable: true },
    {
      key: "actions" as any,
      header: "Action",
      render: (r) =>
        r.status === "requested" ? (
          <button
            onClick={() => handleMarkPaid([r])}
            className="px-3 py-1 bg-money text-white text-[12px] font-body font-medium rounded hover:bg-money/90 transition-colors"
          >
            Mark Paid
          </button>
        ) : (
          <span className="text-[12px] text-muted font-mono">Paid</span>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Withdrawals"
        breadcrumbs={[{ label: "Money", href: "/admin/users" }, { label: "Withdrawals" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={withdrawals}
          loading={loading}
          searchPlaceholder="Search payout requests..."
          searchField={(r) => `${r.userEmail} ${r.payoutTarget}`}
          statusField={(r) => r.status}
          statusOptions={["requested", "paid", "rejected"]}
          bulkActions={bulkActions}
          exportFilename="withdrawals_batch_payout.csv"
          pageSize={10}
        />
      </main>
    </>
  );
}
