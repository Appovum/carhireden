// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Stores Manager (Full CRUD)
// Route: /admin/stores
// Real dynamic database fetching, full CRUD (Create, Edit, Delete, Test Link, Publish).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef, BulkAction } from "@/components/admin/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { toast } from "@/components/Toast";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  domain: string;
  logoUrl?: string | null;
  rawDestinationUrl?: string | null;
  cashbackRate: string;
  networkName: string;
  affiliateNetworkId?: string | null;
  merchantId?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  totalCoupons: number;
}

interface TestLinkResult {
  success: boolean;
  storeName?: string;
  networkName?: string;
  merchantId?: string | null;
  publisherId?: string | null;
  isValid?: boolean;
  testLink?: string;
  issues?: string[];
  error?: string;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [unmappedStores, setUnmappedStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stores" | "unmapped">("stores");

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [rawDestinationUrl, setRawDestinationUrl] = useState("");
  const [defaultCashbackRate, setDefaultCashbackRate] = useState("5.0%");
  const [affiliateNetworkId, setAffiliateNetworkId] = useState("none");
  const [merchantId, setMerchantId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Test Link Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestLinkResult | null>(null);

  // Delete Confirm Modal State
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

  const fetchStores = async () => {
    setLoading(true);
    try {
      const [resActive, resUnmapped] = await Promise.all([
        fetch("/api/admin/stores?status=active"),
        fetch("/api/admin/stores?status=pending_review"),
      ]);

      const dataActive = await resActive.json();
      const dataUnmapped = await resUnmapped.json();

      const mapStoreRow = (s: Record<string, unknown>): StoreRow => ({
        id: String(s.id || ""),
        name: String(s.name || ""),
        slug: String(s.slug || ""),
        domain: String(s.domain || ""),
        logoUrl: (s.logoUrl as string) || null,
        rawDestinationUrl: (s.rawDestinationUrl as string) || null,
        cashbackRate: String(s.defaultCashbackRate || "0.0%"),
        networkName:
          s.affiliateNetworkId === "cj"
            ? "CJ Affiliate"
            : s.affiliateNetworkId === "awin"
            ? "Awin"
            : s.merchantId
            ? "Connected Feed"
            : "Manual Direct",
        affiliateNetworkId: (s.affiliateNetworkId as string) || null,
        merchantId: (s.merchantId as string) || null,
        isFeatured: Boolean(s.isFeatured),
        isActive: Boolean(s.isActive),
        totalCoupons: Number(s.totalCoupons || ((s._count as Record<string, number>)?.coupons) || 0),
      });

      if (dataActive.stores) setStores(dataActive.stores.map(mapStoreRow));
      if (dataUnmapped.stores) setUnmappedStores(dataUnmapped.stores.map(mapStoreRow));
    } catch (err) {
      console.error("Failed to load stores from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const openAddModal = () => {
    setEditingStore(null);
    setName("");
    setSlug("");
    setDomain("");
    setLogoUrl("");
    setRawDestinationUrl("");
    setDefaultCashbackRate("5.0%");
    setAffiliateNetworkId("none");
    setMerchantId("");
    setIsFeatured(false);
    setIsModalOpen(true);
  };

  const openEditModal = (store: StoreRow) => {
    setEditingStore(store);
    setName(store.name);
    setSlug(store.slug);
    setDomain(store.domain);
    setLogoUrl(store.logoUrl || "");
    setRawDestinationUrl(store.rawDestinationUrl || `https://${store.domain}`);
    setDefaultCashbackRate(store.cashbackRate);
    setAffiliateNetworkId(store.affiliateNetworkId || "none");
    setMerchantId(store.merchantId || "");
    setIsFeatured(store.isFeatured);
    setIsModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !domain) {
      toast.warning("Store Name and Domain are required.");
      return;
    }
    setActionLoading(true);

    const payload = {
      id: editingStore?.id,
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      domain,
      logoUrl: logoUrl
        ? (logoUrl.startsWith("http") || logoUrl.startsWith("/") ? logoUrl : `https://${logoUrl}`)
        : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      rawDestinationUrl: rawDestinationUrl
        ? (rawDestinationUrl.startsWith("http") ? rawDestinationUrl : `https://${rawDestinationUrl}`)
        : (domain.startsWith("http") ? domain : `https://${domain}`),
      defaultCashbackRate,
      affiliateNetworkId: affiliateNetworkId === "none" ? null : affiliateNetworkId,
      merchantId: merchantId || null,
      isFeatured,
      isActive: true,
    };

    try {
      const endpoint = "/api/admin/stores";
      const method = editingStore ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.store) {
        setIsModalOpen(false);
        toast.success(editingStore ? "Store updated successfully." : "Store created successfully.");
        fetchStores();
      } else {
        toast.error(data.error || "Failed to save store.");
      }
    } catch {
      toast.error("Network error saving store.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishStore = async (store: StoreRow) => {
    try {
      const res = await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: store.id, isActive: true }),
      });
      const data = await res.json();
      if (res.ok && (data.store || data.success)) {
        toast.success(`Store "${store.name}" published.`);
        fetchStores();
      } else {
        toast.error(data.error || "Failed to publish store.");
      }
    } catch {
      toast.error("Error publishing store.");
    }
  };

  const handleDeleteStore = (store: StoreRow) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Store "${store.name}"`,
      description: `Are you sure you want to permanently delete ${store.name} (${store.domain})? This will also remove associated store offers.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/admin/stores?id=${store.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(`Store "${store.name}" deleted permanently.`);
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchStores();
          } else {
            toast.error(data.error || "Failed to delete store.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }
        } catch {
          toast.error("Error deleting store.");
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleBulkDelete = (selected: StoreRow[]) => {
    setConfirmState({
      isOpen: true,
      title: `Delete ${selected.length} Store${selected.length > 1 ? "s" : ""}`,
      description: `Are you sure you want to permanently delete ${selected.length} selected store(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const ids = selected.map((s) => s.id);
          const res = await fetch("/api/admin/stores", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action: "delete" }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success("Selected store(s) deleted permanently.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchStores();
          } else {
            toast.error(data.error || "Failed to delete selected stores.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }
        } catch {
          toast.error("Error deleting selected stores.");
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleBulkPublish = async (selected: StoreRow[]) => {
    try {
      const ids = selected.map((s) => s.id);
      const res = await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "publish" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Selected store(s) published.");
        fetchStores();
      } else {
        toast.error(data.error || "Failed to publish stores.");
      }
    } catch {
      toast.error("Error publishing stores.");
    }
  };

  const handleTestLink = async (storeId: string) => {
    setTestResult(null);
    setTestModalOpen(true);
    try {
      const res = await fetch("/api/admin/stores/test-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Network error testing store link" });
    }
  };

  const bulkActions: BulkAction<StoreRow>[] = [
    { label: "Publish selected stores", onClick: handleBulkPublish },
    { label: "Delete selected stores", onClick: handleBulkDelete, isDestructive: true },
  ];

  const columns: ColumnDef<StoreRow>[] = [
    {
      key: "name",
      header: "Store name",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.logoUrl ? (
            <img src={r.logoUrl} alt={r.name} className="w-5 h-5 object-contain rounded-[2px]" />
          ) : (
            <div className="w-5 h-5 bg-paper-sunken border border-rule rounded-[2px] text-[10px] font-bold flex items-center justify-center text-muted">
              {r.name.slice(0, 1)}
            </div>
          )}
          <span className="font-medium text-ink">{r.name}</span>
        </div>
      ),
    },
    { key: "domain", header: "Domain", sortable: true },
    { key: "cashbackRate", header: "Cashback rate", sortable: true },
    { key: "networkName", header: "Affiliate network", sortable: true },
    {
      key: "isFeatured",
      header: "Featured",
      sortable: true,
      render: (r) =>
        r.isFeatured ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-money/10 border border-money/20 text-money">
            Featured
          </span>
        ) : (
          <span className="text-muted text-[12px]">Standard</span>
        ),
    },
    { key: "totalCoupons", header: "Offers", isNumeric: true, sortable: true },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {!r.isActive && (
            <button
              onClick={() => handlePublishStore(r)}
              className="px-2 py-1 bg-money text-white text-[11px] font-medium rounded hover:bg-money/90 transition-colors"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => openEditModal(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleTestLink(r.id)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            Test link
          </button>
          <button
            onClick={() => handleDeleteStore(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-urgent text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Stores"
        breadcrumbs={[{ label: "Catalog", href: "/admin/stores" }, { label: "Stores" }]}
        primaryAction={{ label: "Add store", onClick: openAddModal }}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-rule pb-2">
          <button
            onClick={() => setActiveTab("stores")}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[3px] transition-colors ${
              activeTab === "stores" ? "bg-ink text-paper font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            All published stores ({stores.length})
          </button>
          <button
            onClick={() => setActiveTab("unmapped")}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[3px] transition-colors ${
              activeTab === "unmapped" ? "bg-ink text-paper font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            Unmapped review queue ({unmappedStores.length})
          </button>
        </div>

        {/* Table View */}
        <AdminTable
          columns={columns}
          data={activeTab === "stores" ? stores : unmappedStores}
          loading={loading}
          searchPlaceholder="Search stores by name, domain, network..."
          searchField={(r) => `${r.name} ${r.domain} ${r.networkName}`}
          bulkActions={bulkActions}
          exportFilename="stores_catalog.csv"
          pageSize={15}
        />
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete store"
        loading={actionLoading}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule rounded-[4px] shadow-2xl max-w-md w-full p-6 space-y-4 font-body">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-display font-semibold text-[16px]">
                {editingStore ? `Edit Store — ${editingStore.name}` : "Add new merchant store"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-[16px]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3 text-[13px]">
              <div>
                <label className="block text-ink font-medium mb-1">
                  Store Name <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  placeholder="e.g. Nike"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-medium mb-1">Domain</label>
                  <input
                    type="text"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                    placeholder="nike.com"
                  />
                </div>
                <div>
                  <label className="block text-ink font-medium mb-1">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono text-[12px]"
                    placeholder="nike"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  placeholder="https://nike.com/logo.png (leave blank to auto-detect)"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Raw Destination URL (Optional)</label>
                <input
                  type="text"
                  value={rawDestinationUrl}
                  onChange={(e) => setRawDestinationUrl(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  placeholder="https://nike.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-medium mb-1">Cashback Rate</label>
                  <input
                    type="text"
                    value={defaultCashbackRate}
                    onChange={(e) => setDefaultCashbackRate(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                    placeholder="5.0%"
                  />
                </div>
                <div>
                  <label className="block text-ink font-medium mb-1">Affiliate Network</label>
                  <select
                    value={affiliateNetworkId}
                    onChange={(e) => setAffiliateNetworkId(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  >
                    <option value="none">Manual / Direct</option>
                    <option value="cj">CJ Affiliate</option>
                    <option value="awin">Awin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Network Merchant ID (Optional)</label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  placeholder="e.g. 123456"
                />
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeaturedToggle"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-rule"
                />
                <label htmlFor="isFeaturedToggle" className="text-ink font-medium text-[13px] cursor-pointer">
                  Feature store on Homepage carousel
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-rule bg-paper-sunken text-ink text-[12px] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90 transition-colors"
                >
                  {actionLoading ? "Saving..." : editingStore ? "Update store" : "Create store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Link Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-paper-raised border border-rule rounded-[4px] shadow-2xl max-w-lg w-full p-6 space-y-4 font-body">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display font-semibold text-[16px]">Affiliate Link Verification</h3>
              <button onClick={() => setTestModalOpen(false)} className="text-muted hover:text-ink text-[18px]">
                ×
              </button>
            </div>

            {!testResult ? (
              <div className="py-8 text-center text-muted font-mono text-[13px]">Building & verifying link...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[13px]">
                  <div>
                    <span className="text-muted">Store:</span> <strong>{testResult.storeName}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Network:</span> <strong>{testResult.networkName}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] p-3 bg-paper-sunken border border-rule rounded">
                  <div>
                    <div className="text-muted">Merchant ID</div>
                    <div className="font-mono">{testResult.merchantId || "Missing"}</div>
                  </div>
                  <div>
                    <div className="text-muted">Publisher ID</div>
                    <div className="font-mono">{testResult.publisherId || "Missing"}</div>
                  </div>
                </div>

                {testResult.isValid ? (
                  <div className="p-3 bg-money/10 border border-money/30 rounded space-y-2">
                    <div className="text-money font-semibold text-[13px]">Generated Link Valid</div>
                    <div className="font-mono text-[11px] text-ink break-all p-2 bg-paper rounded border border-rule select-all">
                      {testResult.testLink}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={testResult.testLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-ink text-paper text-[11px] font-medium rounded hover:bg-ink/90 transition-colors"
                      >
                        Open test link ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-urgent/10 border border-urgent/30 rounded space-y-2">
                    <div className="text-urgent font-semibold text-[13px]">⚠ Link Configuration Issues</div>
                    <ul className="text-[12px] text-ink space-y-1 font-mono">
                      {testResult.issues?.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[13px] font-medium rounded hover:bg-paper-raised"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
