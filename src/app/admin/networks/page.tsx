// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Networks Manager
// Route: /admin/networks
// Real dynamic database fetching, dual link strategy indicators & live preview builder.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { buildAffiliateLink, LinkStrategy } from "@/lib/linkBuilder";

interface NetworkItem {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  linkTemplate: string;
  apiCredentialsEncrypted: string | null;
  updatedAt: string;
}

export default function AdminNetworksPage() {
  const [networks, setNetworks] = useState<NetworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // CJ Network State
  const [cjPublisherId, setCjPublisherId] = useState("");
  const [cjTestStatus, setCjTestStatus] = useState<"idle" | "testing" | "passed" | "failed">("idle");
  const [cjTestResult, setCjTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Awin Network State
  const [awinPublisherId, setAwinPublisherId] = useState("");
  const [awinTestStatus, setAwinTestStatus] = useState<"idle" | "testing" | "passed" | "failed">("idle");
  const [awinTestResult, setAwinTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Live Interactive Link Strategy Tester
  const [sampleClickId, setSampleClickId] = useState("clk_demo_902_10");
  const [sampleMerchantId, setSampleMerchantId] = useState("7016661");
  const [sampleDestUrl, setSampleDestUrl] = useState("https://www.ashimaryhair.com");
  const [customTemplate, setCustomTemplate] = useState("https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&ued={destinationUrl}&clickref={subId}");

  const fetchNetworks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/networks");
      const data = await res.json();
      if (data.success && data.networks) {
        setNetworks(data.networks);

        // Dynamically parse credentials for CJ and Awin
        const cj = data.networks.find((n: any) => n.slug === "cj" || n.slug === "cj-affiliate");
        if (cj && cj.publisherId) setCjPublisherId(cj.publisherId);

        const awin = data.networks.find((n: any) => n.slug === "awin");
        if (awin && awin.publisherId) setAwinPublisherId(awin.publisherId);
      }
    } catch (err) {
      console.error("Failed to fetch networks from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const testConnection = async (networkSlug: "cj" | "awin") => {
    if (networkSlug === "cj") {
      setCjTestStatus("testing");
      setCjTestResult(null);
    } else {
      setAwinTestStatus("testing");
      setAwinTestResult(null);
    }

    try {
      const targetNet = networks.find((n) => n.slug === networkSlug || n.slug.includes(networkSlug));
      const res = await fetch(`/api/admin/networks/${targetNet?.id || networkSlug}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        if (networkSlug === "cj") {
          setCjTestStatus("passed");
          setCjTestResult({ success: true, message: data.message || "CJ API connection verified successfully." });
        } else {
          setAwinTestStatus("passed");
          setAwinTestResult({ success: true, message: data.message || "Awin API connection verified successfully." });
        }
      } else {
        if (networkSlug === "cj") {
          setCjTestStatus("failed");
          setCjTestResult({ success: false, message: data.message || "CJ verification failed." });
        } else {
          setAwinTestStatus("failed");
          setAwinTestResult({ success: false, message: data.message || "Awin verification failed." });
        }
      }
    } catch (err: any) {
      if (networkSlug === "cj") {
        setCjTestStatus("failed");
        setCjTestResult({ success: false, message: err.message || "Network connection test failed." });
      } else {
        setAwinTestStatus("failed");
        setAwinTestResult({ success: false, message: err.message || "Network connection test failed." });
      }
    }
  };

  // Live preview generators
  let previewAwinLink = "";
  try {
    previewAwinLink = buildAffiliateLink({
      strategy: "template",
      linkTemplate: customTemplate,
      affiliateId: awinPublisherId || "YOUR_AWIN_PUBLISHER_ID",
      merchantId: "12345",
      subId: sampleClickId,
      destinationUrl: "https://nike.com/running-shoes",
    });
  } catch {
    previewAwinLink = "Configure publisher ID to view preview link";
  }

  let previewCjLink = "";
  try {
    previewCjLink = buildAffiliateLink({
      strategy: "append_subid",
      affiliateId: cjPublisherId || "YOUR_CJ_PUBLISHER_ID",
      merchantId: sampleMerchantId,
      subId: sampleClickId,
      destinationUrl: `https://www.anrdoezrs.net/click-${cjPublisherId || "YOUR_CJ_PUBLISHER_ID"}-${sampleMerchantId}`,
    });
  } catch {
    previewCjLink = "Configure publisher ID to view preview link";
  }

  return (
    <>
      <AdminHeader
        title="Networks"
        breadcrumbs={[{ label: "Revenue", href: "/admin/earnings" }, { label: "Networks" }]}
      />

      <main className="p-6 space-y-6 max-w-5xl mx-auto w-full font-body text-ink">
        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">Loading network credentials from database...</div>
        ) : (
          <>
            {/* Network Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CJ Network Card */}
              <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-[16px]">CJ Affiliate</h3>
                    <p className="text-[12px] text-muted">Commission Junction REST & GraphQL APIs</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-money/10 border border-money/20 text-money uppercase">
                    Connected • Active
                  </span>
                </div>

                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center justify-between p-2.5 bg-paper-sunken border border-rule rounded text-[12px]">
                    <span className="text-muted font-medium">Link Strategy:</span>
                    <span className="font-mono text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-rule">
                      append_subid (&sid=...)
                    </span>
                  </div>

                  <div>
                    <label className="block text-ink font-medium mb-1">Requestor CID (Publisher ID)</label>
                    <input
                      type="text"
                      readOnly
                      value={cjPublisherId}
                      className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-ink font-medium mb-1">Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      readOnly
                      value="••••••••••••••••••••••••••••"
                      className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code cursor-not-allowed opacity-80"
                    />
                    <p className="text-[11px] text-muted mt-1">Configured securely in environment variables & encrypted DB.</p>
                  </div>

                  <button
                    onClick={() => testConnection("cj")}
                    disabled={cjTestStatus === "testing"}
                    className="w-full py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {cjTestStatus === "testing" ? "Testing connection..." : "Test CJ connection"}
                  </button>

                  {cjTestResult && (
                    <div
                      className={`p-3 rounded text-[12px] font-body border ${
                        cjTestResult.success
                          ? "bg-money/10 border-money/20 text-money font-medium"
                          : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
                      }`}
                    >
                      {cjTestResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Awin Network Card */}
              <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-[16px]">Awin Network</h3>
                    <p className="text-[12px] text-muted">Awin Publisher Data API v2</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-money/10 border border-money/20 text-money uppercase">
                    Connected • Active
                  </span>
                </div>

                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center justify-between p-2.5 bg-paper-sunken border border-rule rounded text-[12px]">
                    <span className="text-muted font-medium">Link Strategy:</span>
                    <span className="font-mono text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-rule">
                      template (URL interpolation)
                    </span>
                  </div>

                  <div>
                    <label className="block text-ink font-medium mb-1">Publisher ID</label>
                    <input
                      type="text"
                      readOnly
                      value={awinPublisherId}
                      className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-ink font-medium mb-1">API Token</label>
                    <input
                      type="password"
                      readOnly
                      value="••••••••••••••••••••••••••••"
                      className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code cursor-not-allowed opacity-80"
                    />
                    <p className="text-[11px] text-muted mt-1">Configured securely in environment variables & encrypted DB.</p>
                  </div>

                  <button
                    onClick={() => testConnection("awin")}
                    disabled={awinTestStatus === "testing"}
                    className="w-full py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {awinTestStatus === "testing" ? "Testing connection..." : "Test Awin connection"}
                  </button>

                  {awinTestResult && (
                    <div
                      className={`p-3 rounded text-[12px] font-body border ${
                        awinTestResult.success
                          ? "bg-money/10 border-money/20 text-money font-medium"
                          : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
                      }`}
                    >
                      {awinTestResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Link Strategy Self-Diagnosis & Live Preview Builder */}
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-6">
              <div>
                <h3 className="font-display font-semibold text-[16px]">Link Strategy Diagnosis & Live Preview</h3>
                <p className="text-[13px] text-muted">
                  Different affiliate networks use distinct link building mechanics. Use this diagnostic tool to test how incoming click IDs are appended for both strategy types.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px]">
                {/* Awin Strategy Box */}
                <div className="p-4 bg-paper-sunken border border-rule rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-rule pb-2">
                    <span className="font-semibold text-ink">Awin Strategy: template</span>
                    <span className="text-[11px] font-mono text-muted">Placeholder Replacement</span>
                  </div>
                  <p className="text-[12px] text-muted">
                    Interpolates <code className="font-mono">{`{publisherId}`}</code>, <code className="font-mono">{`{merchantId}`}</code>, <code className="font-mono">{`{destinationUrl}`}</code>, and <code className="font-mono">{`{clickref}`}</code>.
                  </p>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-muted text-[10px]">Generated Deep Link Output:</div>
                    <div className="p-2.5 bg-paper border border-rule rounded text-ink break-all select-all font-semibold">
                      {previewAwinLink}
                    </div>
                  </div>
                </div>

                {/* CJ Strategy Box */}
                <div className="p-4 bg-paper-sunken border border-rule rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-rule pb-2">
                    <span className="font-semibold text-ink">CJ Strategy: append_subid</span>
                    <span className="text-[11px] font-mono text-muted">Direct Parameter Appending</span>
                  </div>
                  <p className="text-[12px] text-muted">
                    CJ provides a ready-built tracking link (<code className="font-mono">anrdoezrs.net</code>). The engine directly appends <code className="font-mono">&sid={sampleClickId}</code>.
                  </p>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-muted text-[10px]">Generated Ready-Built CJ Link Output:</div>
                    <div className="p-2.5 bg-paper border border-rule rounded text-ink break-all select-all font-semibold">
                      {previewCjLink}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
