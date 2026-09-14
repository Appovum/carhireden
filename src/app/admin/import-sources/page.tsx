// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Import Sources Manager
// Route: /admin/import-sources
// Real dynamic database fetching + live Awin sync trigger.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { toast } from "@/components/Toast";

interface ImportSourceRow {
  id: string;
  name: string;
  networkName: string;
  status: string;
  lastRun: string;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

interface SyncResult {
  success: boolean;
  storesImported?: number;
  storesUpdated?: number;
  couponsImported?: number;
  couponsUpdated?: number;
  joinedOffersCount?: number;
  unjoinedOffersCount?: number;
  conversionsImported?: number;
  conversionsUpdated?: number;
  noticeMessage?: string;
  errors?: string[];
  error?: string;
}

export default function AdminImportSourcesPage() {
  const [sources, setSources] = useState<ImportSourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Awin Sync State
  const [awinSyncing, setAwinSyncing] = useState(false);
  const [awinSeeded, setAwinSeeded] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // CJ Sync State
  const [cjSyncing, setCjSyncing] = useState(false);
  const [cjSyncResult, setCjSyncResult] = useState<SyncResult | null>(null);

  // Catalog Showcase Seeder State
  const [catalogSeeding, setCatalogSeeding] = useState(false);
  const [catalogSeedResult, setCatalogSeedResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleCatalogSeed = async (reset = false) => {
    setCatalogSeeding(true);
    setCatalogSeedResult(null);
    try {
      const res = await fetch("/api/admin/seed-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupons: 10000, reset }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogSeedResult({ success: true, message: data.message });
        toast.success(data.message || "Seeded 10,000 coupons and 200 merchant brands!");
        fetchSources();
      } else {
        setCatalogSeedResult({ success: false, error: data.error || "Seeding failed" });
        toast.error(data.error || "Seeding failed");
      }
    } catch {
      setCatalogSeedResult({ success: false, error: "Network error during seeding" });
      toast.error("Network error during catalog seeding");
    } finally {
      setCatalogSeeding(false);
    }
  };

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/import-sources");
      const data = await res.json();
      if (data.success && data.sources) {
        setSources(data.sources);
        const hasAwin = data.sources.some((s: ImportSourceRow) =>
          s.networkName.toLowerCase().includes("awin") || s.name.toLowerCase().includes("awin")
        );
        setAwinSeeded(hasAwin);
      }
    } catch (err) {
      console.error("Failed to load import sources from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAwinSeed = async () => {
    try {
      const res = await fetch("/api/admin/awin-sync/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAwinSeeded(true);
        toast.success("Awin network seeded successfully.");
        fetchSources();
      } else {
        toast.error(data.error || "Failed to seed Awin network");
      }
    } catch (err) {
      toast.error("Error seeding Awin network");
    }
  };

  const handleAwinSync = async () => {
    setAwinSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/awin-sync", { method: "POST" });
      const data: SyncResult = await res.json();
      setSyncResult(data);
      if (data.success) {
        toast.success("Awin feed sync completed.");
        fetchSources();
      }
    } catch (err) {
      setSyncResult({ success: false, error: "Network error during Awin sync" });
    } finally {
      setAwinSyncing(false);
    }
  };

  const handleCjSync = async () => {
    setCjSyncing(true);
    setCjSyncResult(null);
    try {
      const res = await fetch("/api/admin/cj-sync", { method: "POST" });
      const data: SyncResult = await res.json();
      setCjSyncResult(data);
      if (data.success) {
        toast.success("CJ feed sync completed.");
        fetchSources();
      }
    } catch (err) {
      setCjSyncResult({ success: false, error: "Network error during CJ sync" });
    } finally {
      setCjSyncing(false);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch("/api/admin/import-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Import run triggered.");
        fetchSources();
      } else {
        toast.error(data.error || "Failed to trigger run");
      }
    } catch (err) {
      toast.error("Error triggering import run");
    }
  };

  const columns: ColumnDef<ImportSourceRow>[] = [
    { key: "name", header: "Feed name", sortable: true },
    { key: "networkName", header: "Network", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-money/10 border border-money/20 text-money uppercase">
          {r.status}
        </span>
      ),
    },
    { key: "lastRun", header: "Last sync", sortable: true },
    { key: "addedCount", header: "Added", isNumeric: true, sortable: true },
    { key: "updatedCount", header: "Updated", isNumeric: true, sortable: true },
    { key: "skippedCount", header: "Skipped", isNumeric: true, sortable: true },
    { key: "failedCount", header: "Failed", isNumeric: true, sortable: true },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) => (
        <button
          onClick={() => handleRunNow(r.id)}
          className="px-2 py-1 bg-ink text-paper text-[11px] font-medium rounded hover:bg-ink/90 transition-colors"
        >
          Run now
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Import sources"
        breadcrumbs={[{ label: "Revenue", href: "/admin/earnings" }, { label: "Import sources" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Product Showcase Catalog Seeder Control Card */}
        <div className="bg-paper-raised border border-rule rounded-[4px] p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-[16px] text-ink">Product Showcase Catalog</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-money/10 text-money uppercase">
                  10,000 Coupons • 200 Brands
                </span>
              </div>
              <p className="text-[13px] text-muted max-w-2xl">
                Non-destructively populates 200 real-world merchant brands (Nike, Sephora, Apple, NordVPN, Hostinger, Booking.com, Target, etc.) and 10,000 verified coupons. All stores are pre-mapped with Awin &amp; CJ affiliate link structures. Your existing database records are safely preserved.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCatalogSeed(false)}
                disabled={catalogSeeding}
                className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {catalogSeeding ? "Seeding 10,000 Coupons..." : "Seed Showcase Catalog (10k)"}
              </button>
            </div>
          </div>

          {catalogSeedResult && (
            <div className={`p-3 rounded border text-[12px] font-mono ${
              catalogSeedResult.success ? "bg-money/10 border-money/30 text-money" : "bg-urgent/10 border-urgent/30 text-urgent"
            }`}>
              {catalogSeedResult.success ? catalogSeedResult.message : catalogSeedResult.error}
            </div>
          )}
        </div>

        {/* Live Network Sync Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CJ Affiliate Network Sync Card */}
          <div className="bg-paper-raised border border-rule rounded-[4px] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h3 className="font-display font-semibold text-[16px] whitespace-nowrap">CJ Affiliate network</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-money/10 text-money uppercase whitespace-nowrap">
                    REST &amp; GraphQL Active
                  </span>
                </div>
                <p className="text-[13px] text-muted mt-1">
                  Syncs advertiser directories, text links &amp; vouchers, and GraphQL commission attribution.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={handleCjSync}
                  disabled={cjSyncing}
                  className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {cjSyncing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Syncing CJ...
                    </span>
                  ) : (
                    "Sync CJ now"
                  )}
                </button>
              </div>
            </div>

            {/* CJ Sync Results Panel */}
            {cjSyncResult && (
              <div className={`p-4 rounded border text-[13px] space-y-3 ${
                cjSyncResult.success
                  ? "bg-money/5 border-money/20"
                  : "bg-urgent/5 border-urgent/20"
              }`}>
                <div className="font-semibold text-ink">
                  {cjSyncResult.success ? "Live CJ Sync Completed" : "Sync Encountered Errors"}
                </div>

                {cjSyncResult.success && (
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <div className="text-muted">Stores</div>
                      <div className="font-mono font-semibold text-ink">
                        {cjSyncResult.storesImported} new, {cjSyncResult.storesUpdated} updated
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Coupons &amp; Deals</div>
                      <div className="font-mono font-semibold text-ink text-money">
                        {cjSyncResult.couponsImported} new, {cjSyncResult.couponsUpdated} updated
                      </div>
                    </div>
                  </div>
                )}

                {cjSyncResult.errors && cjSyncResult.errors.length > 0 && (
                  <details className="text-[11px] text-muted">
                    <summary className="cursor-pointer font-medium">
                      {cjSyncResult.errors.length} warning(s) during sync
                    </summary>
                    <ul className="mt-1 space-y-0.5 font-mono">
                      {cjSyncResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {cjSyncResult.error && (
                  <div className="text-urgent font-mono text-[12px]">{cjSyncResult.error}</div>
                )}
              </div>
            )}
          </div>

          {/* Awin Live Network Sync Card */}
          <div className="bg-paper-raised border border-rule rounded-[4px] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h3 className="font-display font-semibold text-[16px] whitespace-nowrap">Awin network</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-money/10 text-money uppercase whitespace-nowrap">
                    Live Feed Active
                  </span>
                </div>
                <p className="text-[13px] text-muted mt-1">
                  Fetches network-wide offers (<code className="font-mono text-[11px]">membership: &quot;all&quot;</code>). Joined offers map to voucher codes.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!awinSeeded && (
                  <button
                    onClick={handleAwinSeed}
                    className="px-3.5 py-2 bg-paper-sunken border border-rule text-ink text-[13px] font-medium rounded hover:bg-paper-raised transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Initialize Awin
                  </button>
                )}
                <button
                  onClick={handleAwinSync}
                  disabled={awinSyncing}
                  className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {awinSyncing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Syncing Awin...
                    </span>
                  ) : (
                    "Sync Awin now"
                  )}
                </button>
              </div>
            </div>

            {/* Sync Results Panel */}
            {syncResult && (
              <div className={`p-4 rounded border text-[13px] space-y-3 ${
                syncResult.success
                  ? "bg-money/5 border-money/20"
                  : "bg-urgent/5 border-urgent/20"
              }`}>
                <div className="font-semibold text-ink">
                  {syncResult.success ? "Live Awin Sync Completed" : "Sync Encountered Errors"}
                </div>

                {syncResult.success && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                      <div>
                        <div className="text-muted">Stores</div>
                        <div className="font-mono font-semibold text-ink">
                          {syncResult.storesImported} new, {syncResult.storesUpdated} updated
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">Voucher Codes (Joined)</div>
                        <div className="font-mono font-semibold text-ink text-money">
                          {syncResult.joinedOffersCount || 0} codes
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">Link Deals (Unjoined)</div>
                        <div className="font-mono font-semibold text-ink">
                          {syncResult.unjoinedOffersCount || 0} deals
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">Conversions</div>
                        <div className="font-mono font-semibold text-ink">
                          {syncResult.conversionsImported} new, {syncResult.conversionsUpdated} updated
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <details className="text-[11px] text-muted">
                    <summary className="cursor-pointer font-medium">
                      {syncResult.errors.length} warning(s) during sync
                    </summary>
                    <ul className="mt-1 space-y-0.5 font-mono">
                      {syncResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {syncResult.error && (
                  <div className="text-urgent font-mono text-[12px]">{syncResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Import Sources Table */}
        <AdminTable
          columns={columns}
          data={sources}
          loading={loading}
          searchPlaceholder="Search import feeds..."
          searchField={(r) => `${r.name} ${r.networkName}`}
          exportFilename="import_sources.csv"
          pageSize={10}
        />
      </main>
    </>
  );
}
