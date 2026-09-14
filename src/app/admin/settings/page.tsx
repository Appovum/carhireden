// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Settings Manager
// Route: /admin/settings
// Real dynamic database fetching & setting upserts via /api/admin/settings.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { toast } from "@/components/Toast";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("branding");
  const [loading, setLoading] = useState(true);

  // Form State
  const [appName, setAppName] = useState("CouponPilot");
  const [supportEmail, setSupportEmail] = useState("support@couponpilot.com");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState("1.00");
  const [cashbackSplit, setCashbackSplit] = useState("50");
  const [minWithdrawal, setMinWithdrawal] = useState("10.00");
  const [telegramToken, setTelegramToken] = useState("");
  const [demoMode, setDemoMode] = useState(true);

  // Advertising & Payments State
  const [adPlacements, setAdPlacements] = useState<any[]>([
    { id: "featured_store", name: "Featured Store Placement", dailyRateMinor: 1500, description: "Directory header & homepage placement" },
    { id: "featured_coupon", name: "Top Offer Listing Placement", dailyRateMinor: 1500, description: "Pinned top coupon placement" },
    { id: "category_banner", name: "Category Hero Sponsor", dailyRateMinor: 2500, description: "Category banner sponsorship" },
  ]);
  const [adDurationsStr, setAdDurationsStr] = useState("7, 14, 30, 60");
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [paypalEnabled, setPaypalEnabled] = useState(true);

  // SMTP & Email Notification State
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [emailToggles, setEmailToggles] = useState({
    cashbackConfirmed: true,
    payoutProcessed: true,
    advertiserReceipt: true,
    advertiserArtwork: true,
    advertiserLive: true,
  });

  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testSmtpMessage, setTestSmtpMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.settings) {
          if (data.settings.site_name) setAppName(data.settings.site_name);
          if (data.settings.support_email) {
            setSupportEmail(data.settings.support_email);
            setTestEmailRecipient(data.settings.support_email);
          }
          if (data.settings.default_currency) setDefaultCurrency(data.settings.default_currency);
          if (data.settings.currency_exchange_rate) setCurrencyExchangeRate(String(data.settings.currency_exchange_rate));
          if (data.settings.cashback_split) setCashbackSplit(String(data.settings.cashback_split));
          if (data.settings.min_withdrawal) setMinWithdrawal(String(data.settings.min_withdrawal));
          if (data.settings.telegram_bot_token) setTelegramToken(data.settings.telegram_bot_token);
          if (data.settings.ad_placements && Array.isArray(data.settings.ad_placements)) {
            setAdPlacements(data.settings.ad_placements);
          }
          if (data.settings.ad_durations && Array.isArray(data.settings.ad_durations)) {
            setAdDurationsStr(data.settings.ad_durations.join(", "));
          }
          if (data.settings.payment_methods) {
            if (data.settings.payment_methods.stripeEnabled !== undefined) setStripeEnabled(data.settings.payment_methods.stripeEnabled);
            if (data.settings.payment_methods.paypalEnabled !== undefined) setPaypalEnabled(data.settings.payment_methods.paypalEnabled);
          }
          if (data.settings.smtp_host) setSmtpHost(data.settings.smtp_host);
          if (data.settings.smtp_port) setSmtpPort(String(data.settings.smtp_port));
          if (data.settings.smtp_user) setSmtpUser(data.settings.smtp_user);
          if (data.settings.smtp_pass) setSmtpPass(data.settings.smtp_pass);
          if (data.settings.smtp_from) setSmtpFrom(data.settings.smtp_from);
          if (data.settings.smtp_secure !== undefined) setSmtpSecure(Boolean(data.settings.smtp_secure));
          if (data.settings.email_toggles) setEmailToggles((prev) => ({ ...prev, ...data.settings.email_toggles }));
        }
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const parsedDurations = adDurationsStr
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "site_name", value: appName }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "support_email", value: supportEmail }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "default_currency", value: defaultCurrency }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "currency_exchange_rate", value: parseFloat(currencyExchangeRate) || 1.0 }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "cashback_split", value: cashbackSplit }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "min_withdrawal", value: minWithdrawal }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "telegram_bot_token", value: telegramToken, isEncrypted: true }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ad_placements", value: adPlacements }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ad_durations", value: parsedDurations }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "payment_methods", value: { stripeEnabled, paypalEnabled } }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_host", value: smtpHost }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_port", value: smtpPort }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_user", value: smtpUser }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_pass", value: smtpPass, isEncrypted: true }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_from", value: smtpFrom }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smtp_secure", value: smtpSecure }),
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_toggles", value: emailToggles }),
        }),
      ]);
      setSaved(true);
      toast.success("Settings saved successfully.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("site_settings_updated"));
      }
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.warning("Please enter a test email recipient address.");
      return;
    }
    setTestingSmtp(true);
    setTestSmtpMessage(null);

    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testEmailRecipient,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          smtpSecure,
        }),
      });
      const data = await res.json();
      setTestSmtpMessage({
        success: data.success,
        text: data.message || (data.success ? "Test email sent successfully!" : "Failed to send test email."),
      });
    } catch (err: any) {
      setTestSmtpMessage({ success: false, text: err.message || "Failed to reach test email API." });
    } finally {
      setTestingSmtp(false);
    }
  };

  const tabs = [
    { id: "branding", label: "Branding" },
    { id: "advertising", label: "Advertising & payments" },
    { id: "currency", label: "Currency & locale" },
    { id: "cashback", label: "Cashback defaults" },
    { id: "email", label: "Email notifications" },
    { id: "telegram", label: "Telegram bot (Coming Soon)" },
  ];

  return (
    <>
      <AdminHeader
        title="Settings"
        breadcrumbs={[{ label: "System", href: "/admin/settings" }, { label: "Settings" }]}
        primaryAction={{ label: saved ? "Saved" : saving ? "Saving..." : "Save settings", onClick: handleSave as any }}
      />

      <main className="p-6 space-y-6 max-w-5xl mx-auto w-full font-body text-ink">
        {/* Navigation Tabs in Sentence Case */}
        <div className="flex items-center gap-1 border-b border-rule pb-2 overflow-x-auto text-[13px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-[3px] font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-ink text-paper" : "text-muted hover:text-ink hover:bg-paper-sunken"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">Loading platform settings from database...</div>
        ) : (
          <form onSubmit={handleSave} className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-6 max-w-2xl">
            {activeTab === "branding" && (
              <div className="space-y-4 text-[14px]">
                <div>
                  <label className="block font-medium text-ink mb-1">Application name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                  <p className="text-[12px] text-muted mt-1">
                    Displayed in site header, footer, meta title tags, and user email templates.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Support email address</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                  <p className="text-[12px] text-muted mt-1">
                    Where user contact forms and missing cashback inquiries will be sent.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "advertising" && (
              <div className="space-y-6 text-[14px]">
                {/* Gateway Toggles */}
                <div className="space-y-3 border-b border-rule pb-5">
                  <h3 className="font-semibold text-ink text-[15px]">Active Payment Gateways</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-ink font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripeEnabled}
                        onChange={(e) => setStripeEnabled(e.target.checked)}
                        className="rounded border-rule text-ink"
                      />
                      <span>Stripe Checkout (Cards, Apple Pay, Google Pay)</span>
                    </label>

                    <label className="flex items-center gap-2 text-ink font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paypalEnabled}
                        onChange={(e) => setPaypalEnabled(e.target.checked)}
                        className="rounded border-rule text-ink"
                      />
                      <span>PayPal Orders API</span>
                    </label>
                  </div>
                  <p className="text-[12px] text-muted">
                    API keys configured in <code className="font-mono text-ink">.env.local</code> (STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID).
                  </p>
                </div>

                {/* Campaign Durations */}
                <div className="space-y-2 border-b border-rule pb-5">
                  <label className="block font-semibold text-ink text-[15px]">Campaign Duration Options (Days)</label>
                  <input
                    type="text"
                    value={adDurationsStr}
                    onChange={(e) => setAdDurationsStr(e.target.value)}
                    placeholder="7, 14, 30, 60"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  />
                  <p className="text-[12px] text-muted">
                    Comma-separated list of day options selectable by advertisers (e.g. 7, 14, 30, 60).
                  </p>
                </div>

                {/* Placement Options & Pricing */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ink text-[15px]">Placement Types & Daily Rates</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setAdPlacements([
                          ...adPlacements,
                          { id: `placement_${Date.now()}`, name: "New Placement", dailyRateMinor: 2000, description: "Description" },
                        ])
                      }
                      className="px-3 py-1 bg-paper-sunken border border-rule text-ink text-[12px] font-medium rounded hover:bg-paper-raised"
                    >
                      + Add Placement
                    </button>
                  </div>

                  {adPlacements.map((p, idx) => (
                    <div key={idx} className="p-4 bg-paper-sunken border border-rule rounded space-y-3 text-[13px]">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...adPlacements];
                            updated[idx].name = e.target.value;
                            setAdPlacements(updated);
                          }}
                          placeholder="Placement Name"
                          className="flex-1 bg-paper-raised border border-rule rounded px-2.5 py-1.5 font-medium text-ink"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-muted font-mono">$</span>
                          <input
                            type="number"
                            step="1"
                            value={(p.dailyRateMinor || 0) / 100}
                            onChange={(e) => {
                              const updated = [...adPlacements];
                              updated[idx].dailyRateMinor = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setAdPlacements(updated);
                            }}
                            className="w-24 bg-paper-raised border border-rule rounded px-2 py-1.5 font-mono text-ink"
                          />
                          <span className="text-muted text-[12px]">/day</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdPlacements(adPlacements.filter((_, i) => i !== idx))}
                          className="text-muted hover:text-ink text-[12px] px-2"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={p.description || ""}
                        onChange={(e) => {
                          const updated = [...adPlacements];
                          updated[idx].description = e.target.value;
                          setAdPlacements(updated);
                        }}
                        placeholder="Placement description for advertisers"
                        className="w-full bg-paper-raised border border-rule rounded px-2.5 py-1 text-muted text-[12px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "currency" && (
              <div className="space-y-5 text-[14px]">
                <div>
                  <label className="block font-medium text-ink mb-1">Default base currency</label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => {
                      const newCurr = e.target.value;
                      setDefaultCurrency(newCurr);
                      const defaultRates: Record<string, string> = {
                        USD: "1.00",
                        EUR: "0.92",
                        GBP: "0.79",
                        CAD: "1.36",
                        AUD: "1.52",
                        INR: "83.50",
                      };
                      setCurrencyExchangeRate(defaultRates[newCurr] || "1.00");
                    }}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-medium"
                  >
                    <option value="USD">USD ($ - United States Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="CAD">CAD ($ - Canadian Dollar)</option>
                    <option value="AUD">AUD ($ - Australian Dollar)</option>
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                  </select>
                  <p className="text-[12px] text-muted mt-1">
                    All ledger amounts, payouts, and financial reporting will display in this target currency.
                  </p>
                </div>

                <div className="pt-2 border-t border-rule">
                  <label className="block font-medium text-ink mb-1">Currency Exchange Rate Multiplier (1 USD = X target currency)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-muted font-bold">1 USD =</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={currencyExchangeRate}
                      onChange={(e) => setCurrencyExchangeRate(e.target.value)}
                      className="w-48 bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono font-bold"
                    />
                    <span className="font-mono text-[13px] text-ink font-semibold">{defaultCurrency}</span>
                  </div>
                  <p className="text-[12px] text-muted mt-1.5">
                    Converts base ledger amounts into your selected target currency automatically. (e.g. 0.92 for EUR, 0.79 for GBP).
                  </p>
                </div>
              </div>
            )}

            {activeTab === "cashback" && (
              <div className="space-y-4 text-[14px]">
                <div>
                  <label className="block font-medium text-ink mb-1">User cashback share percentage (%)</label>
                  <input
                    type="number"
                    value={cashbackSplit}
                    onChange={(e) => setCashbackSplit(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  />
                  <p className="text-[12px] text-muted mt-1">
                    Percentage of raw affiliate commission shared back to shoppers (e.g. 50% means a $10 commission yields $5 to the user).
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Minimum payout withdrawal threshold (in {defaultCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  />
                  <p className="text-[12px] text-muted mt-1">
                    Minimum confirmed earnings required before a user can request a payout.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-6 text-[14px]">
                {/* SMTP Information Banner */}
                <div className="p-3.5 bg-paper-sunken border border-rule rounded-[4px] text-[12.5px] text-muted space-y-1">
                  <div className="font-semibold text-ink">
                    SMTP Configuration Note
                  </div>
                  <p>
                    You can specify SMTP credentials directly in your environment file (<code className="font-mono text-ink">.env</code> using <code className="font-mono text-ink">SMTP_USER</code>, <code className="font-mono text-ink">SMTP_PASS</code>, <code className="font-mono text-ink">SMTP_HOST</code>) <strong>OR</strong> configure them directly in this form. Credentials saved in this form take precedence and work immediately without restarting the server.
                  </p>
                </div>

                {/* SMTP Credentials */}
                <div className="space-y-4 border-b border-rule pb-5">
                  <h3 className="font-semibold text-ink text-[15px]">SMTP Server Configuration</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-ink mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-ink mb-1">SMTP Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="465"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-ink mb-1">SMTP Username / Email</label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-ink mb-1">SMTP App Password</label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-ink mb-1">From Sender Address</label>
                      <input
                        type="text"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="CouponPilot <noreply@couponpilot.com>"
                        className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <label className="flex items-center gap-2 text-ink font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                          className="rounded border-rule text-ink"
                        />
                        <span>Enable SSL / TLS Security (Port 465)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Transactional Email Event Toggles */}
                <div className="space-y-3 border-b border-rule pb-5">
                  <h3 className="font-semibold text-ink text-[15px]">Transactional Notification Events</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-ink text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailToggles.cashbackConfirmed}
                        onChange={(e) => setEmailToggles({ ...emailToggles, cashbackConfirmed: e.target.checked })}
                        className="rounded border-rule text-ink"
                      />
                      <span>Send notification when user cashback moves from Pending to Confirmed</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-ink text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailToggles.payoutProcessed}
                        onChange={(e) => setEmailToggles({ ...emailToggles, payoutProcessed: e.target.checked })}
                        className="rounded border-rule text-ink"
                      />
                      <span>Send email receipt when withdrawal payout request is approved/processed</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-ink text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailToggles.advertiserReceipt}
                        onChange={(e) => setEmailToggles({ ...emailToggles, advertiserReceipt: e.target.checked })}
                        className="rounded border-rule text-ink"
                      />
                      <span>Send payment confirmation & tax receipt to self-serve advertisers</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-ink text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailToggles.advertiserArtwork}
                        onChange={(e) => setEmailToggles({ ...emailToggles, advertiserArtwork: e.target.checked })}
                        className="rounded border-rule text-ink"
                      />
                      <span>Send banner artwork upload link to advertisers when artwork is missing</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-ink text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailToggles.advertiserLive}
                        onChange={(e) => setEmailToggles({ ...emailToggles, advertiserLive: e.target.checked })}
                        className="rounded border-rule text-ink"
                      />
                      <span>Send live campaign activation alert to advertisers</span>
                    </label>
                  </div>
                </div>

                {/* SMTP Live Test Email Sender */}
                <div className="p-4 bg-paper-sunken border border-rule rounded-[4px] space-y-3">
                  <h4 className="font-semibold text-ink text-[14px]">Send Live Test Email</h4>
                  <p className="text-[12px] text-muted">Verify your SMTP server connection and credentials by sending a test message.</p>

                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="flex-1 bg-paper-raised border border-rule rounded px-3 py-1.5 text-[13px] text-ink"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={testingSmtp}
                      className="px-4 py-1.5 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                    >
                      {testingSmtp ? "Sending Test..." : "Send Test Email"}
                    </button>
                  </div>

                  {testSmtpMessage && (
                    <div
                      className={`p-3 rounded text-[12px] font-mono ${
                        testSmtpMessage.success
                          ? "bg-money/10 border border-money/20 text-money font-semibold"
                          : "bg-red-500/10 border border-red-500/20 text-red-600"
                      }`}
                    >
                      {testSmtpMessage.text}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "telegram" && (
              <div className="space-y-4 text-[14px]">
                <div className="p-6 bg-paper-sunken border border-rule rounded-[4px] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-rule">
                    <div>
                      <h3 className="font-display font-bold text-[16px] text-ink">Telegram Channel Auto-Poster Bot</h3>
                      <p className="text-[12px] text-muted mt-0.5">Automated deal broadcasting to Telegram channels</p>
                    </div>
                    <span className="px-2.5 py-1 bg-ink text-paper text-[10px] font-mono uppercase tracking-widest font-semibold rounded-[2px]">
                      Coming Soon
                    </span>
                  </div>

                  <p className="text-[13px] text-muted leading-relaxed">
                    Automatically broadcast top deals, verified promo codes, and high-cashback store promotions directly to your Telegram subscribers and channels in real-time.
                  </p>

                  <div className="pt-1">
                    <label className="block font-medium text-ink text-[12px] mb-1.5 opacity-80">
                      Telegram Bot Token (Preview)
                    </label>
                    <input
                      type="password"
                      disabled
                      value={telegramToken || "••••••••••••••••••••••••••••••••••••"}
                      className="w-full bg-paper-raised border border-rule rounded px-3 py-2 text-muted font-code text-[13px] cursor-not-allowed opacity-60"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors cursor-pointer"
              >
                {saving ? "Saving settings..." : "Save settings"}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
