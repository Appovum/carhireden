// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Networks Manager
// Route: /admin/networks
// Edit and save affiliate network credentials (stored encrypted in the
// database), test the connection, and preview generated tracking links.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { buildAffiliateLink } from "@/lib/linkBuilder";
import { toast } from "@/components/Toast";

interface NetworkItem {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  linkTemplate: string;
  updatedAt: string;
  publisherId: string;
  hasSecret: boolean;
  secretHint: string;
  source: "database" | "env" | "none";
  isConfigured: boolean;
  missingFields: string[];
}

type Status = "idle" | "busy" | "passed" | "failed";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const NETWORK_META: Record<string, { title: string; subtitle: string; strategy: string; idLabel: string; secretLabel: string; help: string }> = {
  cj: {
    title: "CJ Affiliate",
    subtitle: "Commission Junction REST & GraphQL APIs",
    strategy: "append_subid (&sid=...)",
    idLabel: "Requestor CID (Publisher ID)",
    secretLabel: "Personal Access Token (PAT)",
    help: "developers.cj.com → Personal Access Tokens",
  },
  awin: {
    title: "Awin Network",
    subtitle: "Awin Publisher Data API v2",
    strategy: "template (URL interpolation)",
    idLabel: "Publisher ID",
    secretLabel: "API Token",
    help: "ui.awin.com → Toolbox → API credentials",
  },
};

function NetworkCard({
  network,
  publisherId,
  onPublisherIdChange,
  onSaved,
}: {
  network: NetworkItem;
  publisherId: string;
  onPublisherIdChange: (value: string) => void;
  onSaved: () => void;
}) {
  const meta = NETWORK_META[network.slug] ?? {
    title: network.name,
    subtitle: "Affiliate network",
    strategy: "template",
    idLabel: "Publisher ID",
    secretLabel: "API Token",
    help: "",
  };

  const [apiKey, setApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [testStatus, setTestStatus] = useState<Status>("idle");
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const save = async () => {
    setSaveStatus("busy");
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: network.id,
          slug: network.slug,
          publisherId,
          // Blank means "keep the stored token".
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveStatus("failed");
        toast.error(data.error || "Failed to save credentials.");
        return;
      }
      setSaveStatus("passed");
      setApiKey("");
      toast.success(`${meta.title} credentials saved.`);
      onSaved();
    } catch (err: unknown) {
      setSaveStatus("failed");
      toast.error(errorMessage(err, "Failed to save credentials."));
    }
  };

  const testConnection = async () => {
    setTestStatus("busy");
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/networks/${network.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestStatus(data.success ? "passed" : "failed");
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connection verified." : "Verification failed."),
      });
    } catch (err: unknown) {
      setTestStatus("failed");
      setTestResult({ success: false, message: errorMessage(err, "Network connection test failed.") });
    }
  };

  const badge = network.isConfigured
    ? { text: "Configured", className: "bg-money/10 border-money/20 text-money" }
    : { text: "Not configured", className: "bg-paper-sunken border-rule text-muted" };

  return (
    <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div>
          <h3 className="font-display font-semibold text-[16px]">{meta.title}</h3>
          <p className="text-[12px] text-muted">{meta.subtitle}</p>
        </div>
        <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium uppercase border ${badge.className}`}>
          {badge.text}
        </span>
      </div>

      <div className="space-y-3 text-[13px]">
        <div className="flex items-center justify-between p-2.5 bg-paper-sunken border border-rule rounded text-[12px]">
          <span className="text-muted font-medium">Link Strategy:</span>
          <span className="font-mono text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-rule">
            {meta.strategy}
          </span>
        </div>

        <div>
          <label className="block text-ink font-medium mb-1" htmlFor={`${network.slug}-publisher-id`}>
            {meta.idLabel}
          </label>
          <input
            id={`${network.slug}-publisher-id`}
            type="text"
            value={publisherId}
            onChange={(e) => onPublisherIdChange(e.target.value)}
            placeholder="Enter your publisher ID"
            className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
          />
        </div>

        <div>
          <label className="block text-ink font-medium mb-1" htmlFor={`${network.slug}-api-key`}>
            {meta.secretLabel}
          </label>
          <input
            id={`${network.slug}-api-key`}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={network.hasSecret ? `Stored ${network.secretHint} — leave blank to keep` : "Paste your token"}
            className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
          />
          <p className="text-[11px] text-muted mt-1">
            {meta.help ? `From ${meta.help}. ` : ""}
            Saved encrypted in the database.
            {network.source === "env" && " Currently loaded from .env — saving here overrides it."}
          </p>
        </div>

        {!network.isConfigured && network.missingFields.length > 0 && (
          <p className="text-[12px] text-muted">
            Missing: {network.missingFields.join(", ")}.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saveStatus === "busy"}
            className="flex-1 py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {saveStatus === "busy" ? "Saving..." : "Save credentials"}
          </button>
          <button
            onClick={testConnection}
            disabled={testStatus === "busy"}
            className="flex-1 py-2 bg-paper-sunken border border-rule text-ink font-medium text-[13px] rounded hover:border-ink transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {testStatus === "busy" ? "Testing..." : "Test connection"}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded text-[12px] font-body border ${
              testResult.success
                ? "bg-money/10 border-money/20 text-money font-medium"
                : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminNetworksPage() {
  const [networks, setNetworks] = useState<NetworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publisherIds, setPublisherIds] = useState<Record<string, string>>({});

  // Live Interactive Link Strategy Tester
  const [sampleClickId, setSampleClickId] = useState("clk_demo_902_10");
  const [sampleMerchantId, setSampleMerchantId] = useState("7016661");
  const [customTemplate, setCustomTemplate] = useState(
    "https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&ued={destinationUrl}&clickref={subId}"
  );

  const fetchNetworks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/networks");
      const data = await res.json();
      if (data.success && data.networks) {
        setNetworks(data.networks);
        setPublisherIds(
          Object.fromEntries(data.networks.map((n: NetworkItem) => [n.slug, n.publisherId || ""]))
        );
      }
    } catch (err) {
      console.error("Failed to fetch networks from DB:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  const cjPublisherId = publisherIds["cj"] || publisherIds["cj-affiliate"] || "";
  const awinPublisherId = publisherIds["awin"] || "";

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

  const cards = networks.filter((n) => NETWORK_META[n.slug]);

  return (
    <>
      <AdminHeader
        title="Networks"
        breadcrumbs={[{ label: "Revenue", href: "/admin/earnings" }, { label: "Networks" }]}
      />

      <main className="p-6 space-y-6 max-w-5xl mx-auto w-full font-body text-ink">
        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">
            Loading network credentials from database...
          </div>
        ) : (
          <>
            {cards.length === 0 && (
              <div className="p-8 text-center text-muted font-body text-[13px] bg-paper-raised border border-rule rounded-[4px]">
                No affiliate networks found in the database yet. Run a network sync or seed to create them.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map((network) => (
                <NetworkCard
                  key={network.id}
                  network={network}
                  publisherId={publisherIds[network.slug] ?? ""}
                  onPublisherIdChange={(value) =>
                    setPublisherIds((prev) => ({ ...prev, [network.slug]: value }))
                  }
                  onSaved={fetchNetworks}
                />
              ))}
            </div>

            {/* Live Link Strategy Preview */}
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
              <div className="border-b border-rule pb-3">
                <h3 className="font-display font-semibold text-[16px]">Link strategy preview</h3>
                <p className="text-[12px] text-muted">
                  Check how tracking links are generated with your current publisher IDs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div>
                  <label className="block text-ink font-medium mb-1" htmlFor="sample-click-id">
                    Sample click ID
                  </label>
                  <input
                    id="sample-click-id"
                    type="text"
                    value={sampleClickId}
                    onChange={(e) => setSampleClickId(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
                  />
                </div>
                <div>
                  <label className="block text-ink font-medium mb-1" htmlFor="sample-merchant-id">
                    Sample merchant ID
                  </label>
                  <input
                    id="sample-merchant-id"
                    type="text"
                    value={sampleMerchantId}
                    onChange={(e) => setSampleMerchantId(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1 text-[13px]" htmlFor="awin-template">
                  Awin link template
                </label>
                <input
                  id="awin-template"
                  type="text"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code text-[12px] focus-visible:outline-2 focus-visible:outline-focus-ring"
                />
                <p className="text-[11px] text-muted mt-1">
                  Interpolates <code className="font-mono">{`{publisherId}`}</code>,{" "}
                  <code className="font-mono">{`{merchantId}`}</code>,{" "}
                  <code className="font-mono">{`{destinationUrl}`}</code>, and{" "}
                  <code className="font-mono">{`{subId}`}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted">Awin</span>
                  <p className="p-2.5 bg-paper-sunken border border-rule rounded font-code text-[11px] break-all text-ink">
                    {previewAwinLink}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted">CJ Affiliate</span>
                  <p className="p-2.5 bg-paper-sunken border border-rule rounded font-code text-[11px] break-all text-ink">
                    {previewCjLink}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
