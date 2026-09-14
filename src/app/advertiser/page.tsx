// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Advertiser Self-Serve Portal & Receipt Center
// Route: /advertiser?token=...
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

function AdvertiserPortalContent() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Artwork Upload Form State
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [dimensionWarning, setDimensionWarning] = useState<string | null>(null);

  // Receipt Modal State
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<any | null>(null);

  const fetchPortalData = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/advertiser/portal?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load portal data.");
      }
    } catch {
      setError("Network error loading advertiser portal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      fetchPortalData(tokenParam);
    }
  }, [tokenParam]);

  // Validate image dimensions on URL/file change
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDimensionWarning(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        // Mock data URL or upload URL
        setImageUrl(event.target?.result as string);

        if (width !== 728 || height !== 90) {
          setDimensionWarning(`Notice: Image is ${width}×${height}px. Required leaderboard dimension is 728×90px.`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleArtworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const res = await fetch("/api/advertiser/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenParam || tokenInput,
          imageUrl,
          targetUrl,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setUploadMessage(json.message);
        fetchPortalData(tokenParam || tokenInput);
      } else {
        setUploadMessage(`Error: ${json.error}`);
      }
    } catch {
      setUploadMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!tokenParam && !data) {
    return (
      <section className="bg-paper-raised border border-rule rounded-[4px] p-8 max-w-md mx-auto my-12 font-body text-center space-y-4">
        <h2 className="font-display font-bold text-[22px] text-ink">Advertiser Portal Access</h2>
        <p className="text-muted text-[13px]">
          Enter your Advertiser Magic Token from your confirmation email to access your campaign dashboard.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPortalData(tokenInput);
          }}
          className="space-y-3"
        >
          <input
            type="text"
            required
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="token_..."
            className="w-full bg-paper-sunken border border-rule rounded px-3.5 py-2.5 font-mono text-[13px] text-ink placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90"
          >
            {loading ? "Loading..." : "Access Portal"}
          </button>
        </form>
        {error && <div className="p-3 bg-paper-sunken border border-rule text-ink text-[12px] font-medium">{error}</div>}
      </section>
    );
  }

  const currentOrder = data?.currentOrder;
  const orders = data?.orders || [];
  const metrics = data?.metrics || { totalImpressions: 0, totalClicks: 0, ctr: "0.00%" };

  return (
    <div className="space-y-8 font-body">
      {/* Header Info Banner */}
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-mono text-muted uppercase">Advertiser Account</div>
          <h2 className="font-display font-bold text-[22px] text-ink">{data?.advertiserEmail}</h2>
        </div>
        <div className="flex items-center gap-4 text-left sm:text-right">
          <div>
            <div className="text-[11px] text-muted font-mono uppercase">Total Impressions</div>
            <div className="font-display font-bold text-[18px] text-ink">{metrics.totalImpressions}</div>
          </div>
          <div className="border-l border-rule pl-4">
            <div className="text-[11px] text-muted font-mono uppercase">Total Clicks</div>
            <div className="font-display font-bold text-[18px] text-ink">{metrics.totalClicks}</div>
          </div>
          <div className="border-l border-rule pl-4">
            <div className="text-[11px] text-muted font-mono uppercase">CTR</div>
            <div className="font-display font-bold text-[18px] text-money">{metrics.ctr}</div>
          </div>
        </div>
      </div>

      {/* Banner Artwork Upload Section if in awaiting_creative */}
      {currentOrder?.placementKind === "banner" && currentOrder?.campaignStatus === "awaiting_creative" && (
        <section className="bg-money/10 border border-money/30 rounded-[4px] p-6 space-y-4">
          <div className="space-y-1">
            <div className="font-semibold text-money text-[15px]">Action Required: Upload Banner Artwork</div>
            <p className="text-[13px] text-ink">
              Your placement requires image artwork. Please upload artwork with resolution <strong>728×90px</strong>.
            </p>
          </div>

          <form onSubmit={handleArtworkSubmit} className="space-y-3 max-w-lg">
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Upload Banner Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="w-full bg-paper border border-rule rounded p-2 text-[12px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Target Destination URL</label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://yourwebsite.com/landing-page"
                className="w-full bg-paper border border-rule rounded px-3 py-2 text-[13px] text-ink"
              />
            </div>

            {dimensionWarning && <div className="text-[12px] text-muted font-mono">{dimensionWarning}</div>}

            {imageUrl && (
              <div className="p-3 bg-paper border border-rule rounded space-y-1">
                <div className="text-[11px] text-muted font-mono">Artwork Preview:</div>
                <img src={imageUrl} alt="Preview" className="max-h-24 object-contain rounded" />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !imageUrl}
              className="px-5 py-2.5 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Submit Artwork for Admin Review"}
            </button>

            {uploadMessage && <div className="text-[13px] font-medium text-ink">{uploadMessage}</div>}
          </form>
        </section>
      )}

      {/* Orders Table */}
      <section className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
        <h3 className="font-display font-bold text-[18px] text-ink">Your Placement Campaigns</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[13px]">
            <thead>
              <tr className="border-b border-rule font-mono text-[12px] text-muted">
                <th className="pb-2 font-medium">Order ID</th>
                <th className="pb-2 font-medium">Brand / Store</th>
                <th className="pb-2 font-medium">Placement Type</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-paper-sunken/40">
                  <td className="py-3.5 font-mono text-[12px] text-ink font-semibold truncate max-w-[140px]">
                    {o.id}
                  </td>
                  <td className="py-3.5 font-medium text-ink">{o.brandName || o.store?.name || "Merchant"}</td>
                  <td className="py-3.5 text-muted capitalize">{o.placementKind} ({o.planType.replace(/_/g, " ")})</td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                        o.paymentStatus === "paid" ? "bg-money/15 text-money" : "bg-paper-sunken border border-rule text-ink"
                      }`}
                    >
                      {o.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                        o.campaignStatus === "live"
                          ? "bg-money/15 text-money"
                          : o.campaignStatus === "pending_review"
                          ? "bg-paper-sunken border border-rule text-ink"
                          : "bg-paper-sunken text-muted"
                      }`}
                    >
                      {o.campaignStatus.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-display font-bold text-ink">
                    {formatMoney({ amountMinor: o.priceMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => setActiveReceiptOrder(o)}
                      className="px-2.5 py-1 bg-paper-sunken border border-rule hover:bg-paper-raised text-[11px] font-mono text-ink rounded"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Downloadable / Printable Receipt Modal */}
      {activeReceiptOrder && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
          <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-lg w-full space-y-4 font-body shadow-2xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div>
                <div className="font-display font-bold text-[18px] text-ink">Official Tax Receipt</div>
                <div className="font-mono text-[11px] text-muted">CouponPilot Placement Services</div>
              </div>
              <button
                onClick={() => setActiveReceiptOrder(null)}
                className="text-muted hover:text-ink font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted">Receipt Number:</span>
                <span className="font-mono font-semibold">{activeReceiptOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Date & Time:</span>
                <span className="font-mono">{new Date(activeReceiptOrder.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Advertiser Email:</span>
                <span className="font-mono">{activeReceiptOrder.advertiserEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Brand / Merchant:</span>
                <span className="font-semibold">{activeReceiptOrder.brandName || "Merchant"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Placement Plan:</span>
                <span>{activeReceiptOrder.planType}</span>
              </div>
              <div className="flex justify-between border-t border-rule pt-2 font-bold text-[15px]">
                <span>Total Amount Paid:</span>
                <span className="font-display text-money">
                  {formatMoney({ amountMinor: activeReceiptOrder.priceMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setActiveReceiptOrder(null)}
                className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[12px] font-medium rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdvertiserPortalPage() {
  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-14">
      <Suspense fallback={<div className="p-8 text-center text-muted font-mono text-[13px]">Loading portal...</div>}>
        <AdvertiserPortalContent />
      </Suspense>
    </main>
  );
}
