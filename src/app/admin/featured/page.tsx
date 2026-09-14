// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Featured Placements (Position Boost Queue)
// Route: /admin/featured
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useSiteSettings } from "@/hooks";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";

interface FeaturedOrderRow {
  id: string;
  storeId?: string;
  storeSlug?: string;
  storeName: string;
  couponId?: string;
  couponTitle?: string;
  planType: string;
  durationDays: number;
  priceMinor: number;
  paymentStatus: string;
  campaignStatus: string;
  isLiveTime: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export default function AdminFeaturedPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [orders, setOrders] = useState<FeaturedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/featured");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load featured orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId: string, action: "approve" | "reject" | "end_early") => {
    setActionId(orderId);
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      }
    } catch (err) {
      console.error(`Failed to ${action} order:`, err);
    } finally {
      setActionId(null);
    }
  };

  const columns: ColumnDef<FeaturedOrderRow>[] = [
    {
      key: "id",
      header: "Order ID",
      sortable: true,
      render: (r) => <span className="font-mono text-[12px] font-semibold text-ink">{r.id}</span>,
    },
    {
      key: "storeName",
      header: "Target Store / Offer",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink flex items-center gap-1.5">
            {r.storeName}
            {(r.storeSlug || r.storeId) && (
              <a
                href={`/store/${r.storeSlug || r.storeId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-money hover:underline"
              >
                ↗ view
              </a>
            )}
          </div>
          {r.couponTitle && <div className="text-[11px] text-muted italic">Offer: {r.couponTitle}</div>}
        </div>
      ),
    },
    { key: "planType", header: "Boost Plan", sortable: true },
    {
      key: "priceMinor",
      header: "Price",
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
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase ${
            r.paymentStatus === "paid" ? "bg-money/10 text-money border border-money/20" : "bg-paper-sunken text-ink border border-rule"
          }`}
        >
          {r.paymentStatus}
        </span>
      ),
    },
    {
      key: "campaignStatus",
      header: "Campaign",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase ${
            r.campaignStatus === "live"
              ? "bg-money/10 text-money border border-money/20"
              : r.campaignStatus === "pending_review"
              ? "bg-paper-sunken text-ink border border-rule"
              : r.campaignStatus === "rejected"
              ? "bg-red-500/10 text-red-600 border border-red-500/20"
              : "bg-paper-sunken text-muted"
          }`}
        >
          {r.campaignStatus.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => {
        const isProcessing = actionId === r.id;
        const canApprove = r.campaignStatus === "pending_review" || r.campaignStatus === "awaiting_creative";
        const isLive = r.campaignStatus === "live" || r.campaignStatus === "scheduled";

        return (
          <div className="flex items-center gap-2">
            {canApprove && (
              <>
                <button
                  onClick={() => handleAction(r.id, "approve")}
                  disabled={isProcessing}
                  className="px-2.5 py-1 bg-money text-paper font-medium text-[11px] rounded hover:bg-money/90 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(r.id, "reject")}
                  disabled={isProcessing}
                  className="px-2.5 py-1 bg-paper-sunken border border-rule text-ink hover:text-red-600 font-medium text-[11px] rounded disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </>
            )}

            {isLive && (
              <button
                onClick={() => handleAction(r.id, "end_early")}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-paper-sunken border border-rule text-muted hover:text-ink font-medium text-[11px] rounded disabled:opacity-50 transition-colors"
              >
                End Early
              </button>
            )}

            {!canApprove && !isLive && <span className="text-[11px] font-mono text-muted">—</span>}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <AdminHeader
        title="Featured Placements"
        breadcrumbs={[{ label: "Growth", href: "/admin/featured" }, { label: "Featured" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">Loading featured boost campaigns...</div>
        ) : (
          <AdminTable
            columns={columns}
            data={orders}
            searchPlaceholder="Search boost campaigns..."
            searchField={(r) => `${r.id} ${r.storeName} ${r.planType}`}
            pageSize={10}
          />
        )}
      </main>
    </>
  );
}
