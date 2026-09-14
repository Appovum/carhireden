// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Coupons Manager
// Route: /admin/coupons
// Real dynamic database fetching from Prisma via /api/admin/coupons.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef, BulkAction } from "@/components/admin/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { toast } from "@/components/Toast";

interface CouponRow {
  id: string;
  title: string;
  storeName: string;
  storeLogo?: string;
  code: string | null;
  discountText: string;
  type: string;
  status: "active" | "draft" | "expiring" | "expired" | "rejected";
  usedCount: number;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewCoupon, setPreviewCoupon] = useState<CouponRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Custom Delete Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  // New Coupon Form
  const [storeId, setStoreId] = useState("");
  const [title, setTitle] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("code");
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.coupons) {
        setCoupons(
          data.coupons.map((c: any) => ({
            id: c.id,
            title: c.title,
            storeName: c.store ? c.store.name : "Unmapped Merchant",
            storeLogo: c.store?.logoUrl || "",
            code: c.code || null,
            discountText: c.discountText,
            type: c.type,
            status: c.status,
            usedCount: c.usedCount || 0,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load coupons from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/admin/stores?status=active");
      const data = await res.json();
      if (data.stores) {
        setStores(data.stores.map((s: any) => ({ id: s.id, name: s.name })));
        if (data.stores.length > 0) setStoreId(data.stores[0].id);
      }
    } catch (err) {
      console.error("Failed to load stores for dropdown:", err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchStores();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.warning("Please select a valid store.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          title,
          discountText,
          code: code || null,
          type,
          status: "active",
        }),
      });
      const data = await res.json();
      if (data.coupon) {
        setIsModalOpen(false);
        setTitle("");
        setDiscountText("");
        setCode("");
        toast.success("Coupon created successfully.");
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to create coupon");
      }
    } catch (err) {
      toast.error("Error creating coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (selected: CouponRow[]) => {
    const ids = selected.map((s) => s.id);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "approve" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Selected coupon(s) approved and published.");
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to approve coupons.");
      }
    } catch {
      toast.error("Error approving coupons.");
    }
  };

  const handleReject = async (selected: CouponRow[]) => {
    const ids = selected.map((s) => s.id);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "reject" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Selected coupon(s) rejected.");
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to reject coupons.");
      }
    } catch {
      toast.error("Error rejecting coupons.");
    }
  };

  const handleBulkExpire = async (selected: CouponRow[]) => {
    const ids = selected.map((s) => s.id);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "expire" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Selected coupon(s) marked as expired.");
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to expire coupons.");
      }
    } catch {
      toast.error("Error expiring coupons.");
    }
  };

  const handleBulkDelete = (selected: CouponRow[]) => {
    setConfirmState({
      isOpen: true,
      title: `Delete ${selected.length} Coupon${selected.length > 1 ? "s" : ""}`,
      description: `Are you sure you want to permanently delete ${selected.length} selected coupon(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const ids = selected.map((s) => s.id);
          const res = await fetch("/api/admin/coupons", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action: "delete" }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success("Selected coupon(s) deleted permanently.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchCoupons();
          } else {
            toast.error(data.error || "Failed to delete selected coupons.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }
        } catch {
          toast.error("Error deleting selected coupons.");
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const bulkActions: BulkAction<CouponRow>[] = [
    { label: "Approve & publish selected", onClick: handleApprove },
    { label: "Reject selected", onClick: handleReject, isDestructive: true },
    { label: "Mark expired", onClick: handleBulkExpire },
    { label: "Delete selected", onClick: handleBulkDelete, isDestructive: true },
  ];

  const columns: ColumnDef<CouponRow>[] = [
    { key: "title", header: "Coupon title", sortable: true },
    {
      key: "storeName",
      header: "Store name",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.storeLogo ? (
            <img src={r.storeLogo} alt={r.storeName} className="w-5 h-5 object-contain rounded-[2px]" />
          ) : (
            <div className="w-5 h-5 bg-paper-sunken border border-rule rounded-[2px] text-[10px] font-bold flex items-center justify-center text-muted">
              {r.storeName.slice(0, 1)}
            </div>
          )}
          <span>{r.storeName}</span>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      render: (r) =>
        r.code ? (
          <code className="font-mono bg-paper-sunken px-2 py-0.5 border border-rule rounded text-ink font-semibold">
            {r.code}
          </code>
        ) : (
          <span className="text-muted text-[12px]">Deal (No code)</span>
        ),
    },
    { key: "discountText", header: "Discount", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-medium border uppercase ${
            r.status === "active"
              ? "bg-money/10 border-money/20 text-money font-semibold"
              : r.status === "draft"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 font-semibold"
              : r.status === "rejected"
              ? "bg-urgent/10 border-urgent/20 text-urgent font-medium"
              : r.status === "expiring"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
              : "bg-paper-sunken border-rule text-muted"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "usedCount", header: "Used count", isNumeric: true, sortable: true },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === "draft" && (
            <>
              <button
                onClick={() => handleApprove([r])}
                className="px-2.5 py-1 bg-money text-white text-[11px] font-medium rounded hover:bg-money/90 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject([r])}
                className="px-2.5 py-1 bg-urgent/10 border border-urgent/20 text-urgent text-[11px] font-medium rounded hover:bg-urgent/20 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {r.status === "active" && (
            <button
              onClick={() => handleReject([r])}
              className="px-2 py-1 bg-paper-sunken border border-rule text-muted hover:text-urgent text-[11px] font-medium rounded transition-colors"
            >
              Reject
            </button>
          )}
          {r.status === "rejected" && (
            <button
              onClick={() => handleApprove([r])}
              className="px-2 py-1 bg-paper-sunken border border-rule text-money hover:bg-money/10 text-[11px] font-medium rounded transition-colors"
            >
              Approve
            </button>
          )}
          <button
            onClick={() => setPreviewCoupon(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Coupons"
        breadcrumbs={[{ label: "Catalog", href: "/admin/coupons" }, { label: "Coupons" }]}
        primaryAction={{ label: "Add coupon", onClick: () => setIsModalOpen(true) }}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={coupons}
          loading={loading}
          searchPlaceholder="Search coupons by title, store, or code..."
          searchField={(r) => `${r.title} ${r.storeName} ${r.code || ""}`}
          statusField={(r) => r.status}
          statusOptions={["draft", "active", "expiring", "expired", "rejected"]}
          bulkActions={bulkActions}
          exportFilename="coupons_export.csv"
          pageSize={10}
        />

        {/* Custom Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel="Delete permanently"
          loading={actionLoading}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Add Coupon Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-md w-full space-y-4 font-body">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display font-semibold text-[16px]">Add new coupon</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-ink font-medium mb-1">Target store</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Coupon title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 20% OFF Select Order"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Discount badge text</label>
                  <input
                    type="text"
                    required
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value)}
                    placeholder="e.g. 20% OFF"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Promo code (Optional)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SAVE20"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono uppercase"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[12px] rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90 transition-colors"
                  >
                    {submitting ? "Saving..." : "Create coupon"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Live Card Preview Modal */}
        {previewCoupon && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-lg w-full space-y-4 font-body">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display font-semibold text-[16px]">Public card preview</h3>
                <button onClick={() => setPreviewCoupon(null)} className="text-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <div className="p-4 bg-paper border border-rule rounded-[4px] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {previewCoupon.storeLogo && (
                      <img src={previewCoupon.storeLogo} alt={previewCoupon.storeName} className="w-5 h-5 object-contain rounded-[2px]" />
                    )}
                    <span className="text-[13px] text-muted font-medium">{previewCoupon.storeName}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-paper-sunken border border-rule rounded font-semibold text-money">
                    {previewCoupon.discountText}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-[15px] text-ink">{previewCoupon.title}</h4>
                {previewCoupon.code && (
                  <div className="p-2 bg-paper-sunken border border-rule font-code font-bold text-[14px] text-center rounded">
                    {previewCoupon.code}
                  </div>
                )}
              </div>

              <button
                onClick={() => setPreviewCoupon(null)}
                className="w-full py-2 bg-ink text-paper font-medium text-[13px] rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
