// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Ads, Banner & Google AdSense Manager
// Route: /admin/ads
// Supports Image Banners, Google AdSense Code Snippets & Custom Script Injection.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { toast } from "@/components/Toast";

interface AdCreativeRow {
  id: string;
  name: string;
  type: "image" | "adsense" | "custom_html";
  slotPosition: string;
  imageUrl?: string;
  targetUrl?: string;
  htmlContent?: string;
  impressions: number;
  clicks: number;
  ctrPct: number;
  isEnabled: boolean;
  campaignStatus: string;
}

export default function AdminAdsPage() {
  const [creatives, setCreatives] = useState<AdCreativeRow[]>([]);
  const [slotCounts, setSlotCounts] = useState({ header_top: 0, store_sidebar: 0, in_feed: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [adType, setAdType] = useState<"image" | "adsense" | "custom_html">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [slotPosition, setSlotPosition] = useState("header_top");
  const [submitting, setSubmitting] = useState(false);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ads");
      const data = await res.json();
      if (data.success && data.creatives) {
        setCreatives(data.creatives);
        if (data.slotCounts) setSlotCounts(data.slotCounts);
      }
    } catch (err) {
      console.error("Failed to load ad creatives from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleToggle = async (creativeId: string) => {
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", creativeId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAds();
      }
    } catch (err) {
      console.error("Failed to toggle creative:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || (adType === "adsense" ? "Google AdSense Unit" : "Custom Banner"),
          type: adType,
          imageUrl: adType === "image" ? imageUrl : null,
          targetUrl: adType === "image" ? targetUrl : null,
          htmlContent: adType !== "image" ? htmlContent : null,
          slotPosition,
          isEnabled: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setTitle("");
        setImageUrl("");
        setTargetUrl("");
        setHtmlContent("");
        toast.success("Ad unit created successfully.");
        fetchAds();
      } else {
        toast.error(data.error || "Failed to create ad unit");
      }
    } catch (err: any) {
      toast.error(`Error creating ad unit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<AdCreativeRow>[] = [
    {
      key: "name",
      header: "Ad Creative & Format",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.type === "image" && r.imageUrl ? (
            <img src={r.imageUrl} alt={r.name} className="w-10 h-7 object-cover rounded border border-rule" />
          ) : (
            <div className="w-10 h-7 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center font-mono text-[10px] font-bold text-amber-700">
              {r.type === "adsense" ? "ADS" : "HTML"}
            </div>
          )}
          <div>
            <div className="font-medium text-ink flex items-center gap-1.5">
              {r.name}
              <span
                className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                  r.type === "adsense"
                    ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                    : r.type === "custom_html"
                    ? "bg-purple-500/15 text-purple-700 border border-purple-500/30"
                    : "bg-paper-sunken text-muted border border-rule"
                }`}
              >
                {r.type}
              </span>
            </div>
            {r.targetUrl && r.targetUrl !== "#" && (
              <a href={r.targetUrl} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-money hover:underline">
                {r.targetUrl}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "slotPosition",
      header: "Placement Slot",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-[12px] text-ink">
          {r.slotPosition === "header_top"
            ? "Header Top (728×90)"
            : r.slotPosition === "store_sidebar"
            ? "Store Sidebar (300×250)"
            : "In-Feed (300×120)"}
        </span>
      ),
    },
    {
      key: "impressions",
      header: "Impressions",
      isNumeric: true,
      sortable: true,
      render: (r) => <span className="font-mono text-[12px] tabular-nums text-ink">{r.impressions.toLocaleString()}</span>,
    },
    {
      key: "clicks",
      header: "Clicks",
      isNumeric: true,
      sortable: true,
      render: (r) => <span className="font-mono text-[12px] tabular-nums text-ink">{r.clicks.toLocaleString()}</span>,
    },
    {
      key: "ctrPct",
      header: "CTR",
      isNumeric: true,
      sortable: true,
      render: (r) => <span className="font-mono text-[12px] tabular-nums font-semibold text-money">{r.ctrPct.toFixed(2)}%</span>,
    },
    {
      key: "isEnabled",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase ${
            r.isEnabled ? "bg-money/10 text-money border border-money/20" : "bg-paper-sunken text-muted border border-rule"
          }`}
        >
          {r.isEnabled ? "ACTIVE" : "PAUSED"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <button
          onClick={() => handleToggle(r.id)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
            r.isEnabled
              ? "bg-paper-sunken border border-rule text-ink hover:text-red-600"
              : "bg-money text-paper hover:bg-money/90"
          }`}
        >
          {r.isEnabled ? "Pause" : "Activate"}
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader title="Ads Manager" breadcrumbs={[{ label: "Growth", href: "/admin/ads" }, { label: "Ads & AdSense" }]} />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[26px] font-bold text-ink">Visual Ad & Google AdSense Manager</h1>
            <p className="text-[14px] text-muted">
              Manage banner ad slots, Google AdSense code snippets, and custom script ad units.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded hover:bg-ink/90 transition-colors shadow-2xs"
          >
            + Add ad unit / AdSense
          </button>
        </div>

        {/* Visual Placement Slot Map */}
        <div className="bg-paper-raised border border-rule rounded-[4px] p-5 space-y-3">
          <h2 className="font-display font-semibold text-[15px] text-ink">Visual ad placement map</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-paper-sunken border border-rule rounded flex flex-col justify-between gap-2">
              <div>
                <div className="font-semibold text-ink text-[13px]">1. Header top banner</div>
                <div className="text-[12px] text-muted">728×90 Leaderboard above homepage header</div>
              </div>
              <div className="text-[11px] font-mono text-ink font-semibold">
                Active: {slotCounts.header_top} {slotCounts.header_top === 1 ? "creative" : "creatives"}
              </div>
            </div>

            <div className="p-4 bg-paper-sunken border border-rule rounded flex flex-col justify-between gap-2">
              <div>
                <div className="font-semibold text-ink text-[13px]">2. Store sidebar banner</div>
                <div className="text-[12px] text-muted">300×250 Medium rectangle in store detail sidebar</div>
              </div>
              <div className="text-[11px] font-mono text-ink font-semibold">
                Active: {slotCounts.store_sidebar} {slotCounts.store_sidebar === 1 ? "creative" : "creatives"}
              </div>
            </div>

            <div className="p-4 bg-paper-sunken border border-rule rounded flex flex-col justify-between gap-2">
              <div>
                <div className="font-semibold text-ink text-[13px]">3. Coupon in-feed banner</div>
                <div className="text-[12px] text-muted">In-line card banner between coupon listings</div>
              </div>
              <div className="text-[11px] font-mono text-ink font-semibold">
                Active: {slotCounts.in_feed} {slotCounts.in_feed === 1 ? "creative" : "creatives"}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">Loading ad units & AdSense scripts...</div>
        ) : (
          <AdminTable
            columns={columns}
            data={creatives}
            searchPlaceholder="Search ad units or AdSense scripts..."
            searchField={(r) => `${r.name} ${r.type} ${r.slotPosition}`}
            exportFilename="ads_campaigns_export.csv"
            pageSize={10}
          />
        )}

        {/* Add Ad Creative / AdSense Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-lg w-full space-y-4 font-body">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display font-semibold text-[16px]">Add New Ad Unit / Google AdSense</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-[13px]">
                {/* Ad Format Selector */}
                <div>
                  <label className="block text-ink font-medium mb-1">Ad Format Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdType("image")}
                      className={`p-2.5 rounded border text-center font-medium transition-colors ${
                        adType === "image"
                          ? "border-ink bg-paper-sunken font-bold text-ink"
                          : "border-rule bg-paper text-muted hover:text-ink"
                      }`}
                    >
                      Image Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdType("adsense")}
                      className={`p-2.5 rounded border text-center font-medium transition-colors ${
                        adType === "adsense"
                          ? "border-amber-500 bg-amber-500/10 font-bold text-amber-700"
                          : "border-rule bg-paper text-muted hover:text-ink"
                      }`}
                    >
                      Google AdSense
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdType("custom_html")}
                      className={`p-2.5 rounded border text-center font-medium transition-colors ${
                        adType === "custom_html"
                          ? "border-purple-500 bg-purple-500/10 font-bold text-purple-700"
                          : "border-rule bg-paper text-muted hover:text-ink"
                      }`}
                    >
                      Custom HTML
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Campaign Name / Label</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      adType === "adsense"
                        ? "Google AdSense 728x90 Unit"
                        : adType === "custom_html"
                        ? "Custom Script Ad"
                        : "Nike Header Banner"
                    }
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Placement Slot</label>
                  <select
                    value={slotPosition}
                    onChange={(e) => setSlotPosition(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  >
                    <option value="header_top">Header top banner (728×90)</option>
                    <option value="store_sidebar">Store sidebar banner (300×250)</option>
                    <option value="in_feed">Coupon in-feed banner (300×120)</option>
                  </select>
                </div>

                {adType === "image" ? (
                  <>
                    <div>
                      <label className="block text-ink font-medium mb-1">Image URL</label>
                      <input
                        type="text"
                        required
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/banner.png"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono text-[12px]"
                      />
                    </div>

                    <div>
                      <label className="block text-ink font-medium mb-1">Target Destination URL</label>
                      <input
                        type="text"
                        required
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://couponpilot.com"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono text-[12px]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-ink font-medium mb-1">
                      {adType === "adsense" ? "Google AdSense Code Snippet" : "Custom HTML / Script Code"}
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder={
                        adType === "adsense"
                          ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXX" crossorigin="anonymous"></script>\n<ins class="adsbygoogle" style="display:inline-block;width:728px;height:90px" data-ad-client="ca-pub-XXXXXXXXXXXXXX" data-ad-slot="1234567890"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`
                          : `<div><a href="..."><img src="..." /></a></div>`
                      }
                      className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono text-[11px]"
                    />
                    <p className="text-[11px] text-muted mt-1 font-mono">
                      Paste your Google AdSense &lt;ins&gt; and &lt;script&gt; code tags directly.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
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
                    {submitting ? "Saving..." : "Create ad unit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
