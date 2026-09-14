// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Deal Alert Subscriptions Manager
// Route: /admin/alerts
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

interface AlertRow {
  id: string;
  email: string;
  userName: string;
  storeName: string;
  keyword: string;
  isEnabled: boolean;
  createdAt: string;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts");
      const data = await res.json();
      if (data.alerts) {
        setAlerts(
          data.alerts.map((a: any) => ({
            id: a.id,
            email: a.user?.email || "Guest Shopper",
            userName: a.user?.name || "Shopper",
            storeName: a.store?.name || "All Stores / Category",
            keyword: a.keyword || "Any Keyword",
            isEnabled: a.isEnabled,
            createdAt: new Date(a.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load deal alerts from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (alertId: string) => {
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action: "delete" }),
      });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setDeleteId(null);
      }
    } catch {
      console.error("Network error deleting alert.");
    }
  };

  const columns: ColumnDef<AlertRow>[] = [
    { key: "email", header: "Shopper email", sortable: true },
    { key: "storeName", header: "Target store", sortable: true },
    { key: "keyword", header: "Keyword filter", sortable: true },
    {
      key: "isEnabled",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
            r.isEnabled
              ? "bg-money/10 border-money/20 text-money"
              : "bg-paper-sunken border-rule text-muted"
          }`}
        >
          {r.isEnabled ? "Active" : "Paused"}
        </span>
      ),
    },
    { key: "createdAt", header: "Subscribed date", sortable: true },
    {
      key: "actions",
      header: "Action",
      render: (r) => (
        <button
          onClick={() => setDeleteId(r.id)}
          className="px-2.5 py-1 bg-paper-sunken border border-rule text-urgent text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Deal Alert Subscriptions"
        breadcrumbs={[{ label: "Engagement", href: "/admin/alerts" }, { label: "Alerts" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={alerts}
          loading={loading}
          searchPlaceholder="Search alert subscriptions..."
          searchField={(r) => `${r.email} ${r.storeName} ${r.keyword}`}
          exportFilename="deal_alerts_export.csv"
          pageSize={10}
        />

        <ConfirmModal
          isOpen={!!deleteId}
          title="Delete Alert Subscription"
          description="Are you sure you want to delete this deal alert subscription? The shopper will no longer receive notifications for new deals."
          confirmLabel="Delete subscription"
          onConfirm={() => deleteId && handleDelete(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      </main>
    </>
  );
}
