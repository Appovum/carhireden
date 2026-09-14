// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Interactive Installer Wizard UI Page
// 1-click installation wizard for non-expert buyers.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";

export default function InstallPage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("Owner");
  const [siteName, setSiteName] = useState("CouponPilot");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail,
          adminPassword,
          adminName,
          siteName,
          defaultCurrency,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, message: "Installation request failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6 font-body">
      <div className="max-w-md w-full bg-paper-raised border border-rule rounded-[4px] p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-paper-sunken border border-rule-strong rounded-[4px] flex items-center justify-center mx-auto text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="font-display text-[24px] font-bold text-ink">CouponPilot Installer</h1>
          <p className="text-[13px] text-muted">Set up your commercial coupon &amp; cashback app in 1 minute</p>
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl text-xs font-medium ${
              result.success ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
            }`}
          >
            <p className="font-bold">{result.success ? "Success!" : "Installation Error"}</p>
            <p className="mt-1">{result.message}</p>
            {result.success && (
              <a
                href="/admin"
                className="mt-3 inline-block px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400"
              >
                Go to Admin Dashboard →
              </a>
            )}
          </div>
        )}

        {!result?.success && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Site Title</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                placeholder="admin@yourdomain.com"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition"
            >
              {loading ? "Installing CouponPilot..." : "Complete Setup & Launch"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
