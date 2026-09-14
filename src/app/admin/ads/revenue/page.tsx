// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Ad Revenue & Transactions Ledger Page
// Route: /admin/ads/revenue
// Detailed advertiser placement transaction history with payment methods, timestamps, and order statuses.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

interface AdTransactionRow {
  id: string;
  transactionId: string;
  orderId: string;
  storeName: string;
  advertiserEmail: string;
  planType: string;
  durationDays: number;
  priceMinor: number;
  paymentMethod: string;
  paymentStatus: "paid" | "pending" | "failed";
  approvalStatus: "approved" | "pending_approval" | "rejected";
  createdAt: string;
  formattedDate: string;
}

export default function AdminAdRevenuePage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [transactions, setTransactions] = useState<AdTransactionRow[]>([]);
  const [totals, setTotals] = useState({
    totalAdRevenueMinor: 0,
    completedCount: 0,
    pendingCount: 0,
    totalOrdersCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/admin/ads/transactions");
      const data = await res.json();
      if (data.success && data.transactions) {
        setTransactions(
          data.transactions.map((t: any) => ({
            ...t,
            formattedDate: t.createdAt
              ? new Date(t.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
          }))
        );
        const t = data.totals || data.summary;
        if (t) {
          setTotals({
            totalAdRevenueMinor: t.totalAdRevenueMinor || 0,
            completedCount: t.completedCount || 0,
            pendingCount: t.pendingCount || 0,
            totalOrdersCount: t.totalOrdersCount || 0,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load ad transactions from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleMarkPaid = async (orderId: string) => {
    setActionId(orderId);
    try {
      const res = await fetch("/api/admin/ads/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus: "paid" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTransactions();
      }
    } catch (err) {
      console.error("Failed to mark order paid:", err);
    } finally {
      setActionId(null);
    }
  };

  const columns: ColumnDef<AdTransactionRow>[] = [
    {
      key: "transactionId",
      header: "Order ID",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-[12px] font-semibold text-ink">
          {r.transactionId}
        </span>
      ),
    },
    {
      key: "storeName",
      header: "Merchant store",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.storeName}</div>
          <div className="text-[11px] text-muted">{r.advertiserEmail}</div>
        </div>
      ),
    },
    { key: "planType", header: "Placement plan", sortable: true },
    {
      key: "paymentMethod",
      header: "Payment method",
      sortable: true,
      render: (r) => (
        <span className="text-[12px] font-medium text-ink">
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: "priceMinor",
      header: "Revenue",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.priceMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      render: (r) => {
        if (r.paymentStatus === "paid") {
          return (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-money/10 border border-money/20 text-money uppercase">
              PAID
            </span>
          );
        }
        if (r.paymentStatus === "failed") {
          return (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-500/10 border border-red-500/20 text-red-600 uppercase">
              FAILED
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-paper-sunken border border-rule text-ink uppercase">
              PENDING
            </span>
            <button
              onClick={() => handleMarkPaid(r.id)}
              disabled={actionId === r.id}
              className="px-2 py-0.5 bg-money text-paper text-[10px] font-mono font-medium rounded hover:bg-money/90 disabled:opacity-50 transition-colors"
            >
              Mark Paid
            </button>
          </div>
        );
      },
    },
    {
      key: "campaignStatus",
      header: "Campaign",
      sortable: true,
      render: (r: any) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-paper-sunken border border-rule text-ink uppercase">
          {(r.campaignStatus || "PENDING").replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "formattedDate",
      header: "Date & time",
      sortable: true,
      render: (r) => (
        <span className="text-[11px] font-mono text-muted whitespace-nowrap">
          {r.formattedDate}
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Ad earnings & transactions"
        breadcrumbs={[{ label: "Growth", href: "/admin/ads" }, { label: "Ad transactions" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Metric Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider">Total Ad Revenue</div>
            <div className="font-display font-bold text-[24px] text-money tabular-nums">
              {formatMoney({ amountMinor: totals.totalAdRevenueMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
            </div>
            <div className="text-[11px] text-muted font-mono">From self-serve advertiser placements</div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider">Paid Transactions</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {totals.completedCount}
            </div>
            <div className="text-[11px] text-muted font-mono">Captured payments</div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider">Pending Orders</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {totals.pendingCount}
            </div>
            <div className="text-[11px] text-muted font-mono">Awaiting checkout / approval</div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider">Total Orders</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {totals.totalOrdersCount}
            </div>
            <div className="text-[11px] text-muted font-mono">All placement requests</div>
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={transactions}
          loading={loading}
          searchPlaceholder="Search ad transactions by ID, store, or payment method..."
          searchField={(r) => `${r.transactionId} ${r.storeName} ${r.paymentMethod} ${r.paymentStatus}`}
          exportFilename="ad_revenue_transactions_export.csv"
          pageSize={10}
        />
      </main>
    </>
  );
}
