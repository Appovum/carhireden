// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Missing Cashback Claims Queue
// Route: /admin/claims
// Real dynamic database fetching from Prisma via /api/admin/claims.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";
import { toast } from "@/components/Toast";

interface ClaimRow {
  id: string;
  userEmail: string;
  storeName: string;
  orderNumber: string;
  purchaseAmountMinor: number;
  expectedCashbackMinor: number;
  clickId?: string | null;
  clickDate?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function AdminClaimsPage() {
  const { default_currency } = useSiteSettings();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = async () => {
    try {
      const res = await fetch("/api/admin/claims");
      const data = await res.json();
      if (Array.isArray(data)) {
        setClaims(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleResolve = async (claimId: string, approve: boolean) => {
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action: approve ? "approve" : "reject" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(approve ? "Claim approved." : "Claim rejected.");
        fetchClaims();
      } else {
        toast.error(data.error || "Failed to resolve claim");
      }
    } catch (err) {
      toast.error("Error resolving claim");
    }
  };

  const columns: ColumnDef<ClaimRow>[] = [
    { key: "userEmail", header: "Shopper", sortable: true },
    { key: "storeName", header: "Store", sortable: true },
    { key: "orderNumber", header: "Order number", sortable: true },
    {
      key: "purchaseAmountMinor",
      header: "Order total",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.purchaseAmountMinor, currency: default_currency }),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
            r.status === "approved"
              ? "bg-money/10 border-money/20 text-money"
              : r.status === "pending"
              ? "bg-paper-sunken border-rule text-ink font-medium"
              : "bg-urgent/10 border-urgent/20 text-urgent"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleResolve(r.id, true)}
              className="px-2.5 py-1 bg-ink text-paper text-[11px] font-medium rounded hover:bg-ink/90 transition-colors cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => handleResolve(r.id, false)}
              className="px-2.5 py-1 bg-paper-sunken border border-rule text-urgent text-[11px] font-medium rounded hover:bg-paper-raised transition-colors cursor-pointer"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-muted text-[12px]">Resolved</span>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Missing cashback claims"
        breadcrumbs={[{ label: "Money", href: "/admin/users" }, { label: "Claims" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={claims}
          loading={loading}
          searchPlaceholder="Search claims by shopper or order number..."
          searchField={(r) => `${r.userEmail} ${r.orderNumber} ${r.storeName}`}
          statusField={(r) => r.status}
          statusOptions={["pending", "approved", "rejected"]}
          exportFilename="claims_export.csv"
          pageSize={10}
        />
      </main>
    </>
  );
}
