// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Login Page
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import Link from "next/link";

// One-click demo logins, shown only on the public CodeCanyon demo
// (NEXT_PUBLIC_DEMO_MODE=true). Credentials match the listing.
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_ACCOUNTS = [
  { label: "Admin dashboard", hint: "/admin", email: "admin@couponpilot.com", password: "password123" },
  { label: "Shopper account", hint: "/account", email: "demo@example.com", password: "password123" },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Invalid email or password.");
      } else {
        window.location.assign(data.user.role === "admin" ? "/admin" : "/account");
      }
    } catch {
      setError("Login request failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void login(email, password);
  };

  const handleDemoLogin = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    void login(account.email, account.password);
  };

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-14 flex items-center justify-center w-full">
      <div className="w-full max-w-md bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink leading-tight">
            Welcome back
          </h1>
          <p className="font-body text-[14px] text-muted">
            Log in to track your cashback earnings and view saved offers
          </p>
        </div>

        {error && (
          <div className="p-3 bg-paper-sunken border border-rule text-ink text-[13px] font-body rounded-[3px]">
            {error}
          </div>
        )}

        {IS_DEMO && (
          <div className="space-y-2">
            <p className="font-code text-[11px] uppercase tracking-wider text-muted text-center">
              Live demo — one-click sign in
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin(account)}
                  className="flex flex-col items-center gap-0.5 py-2.5 px-3 bg-paper-sunken border border-rule rounded-[3px] hover:border-ink transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <span className="font-body font-medium text-[13px] text-ink">{account.label}</span>
                  <span className="font-code text-[11px] text-muted">{account.email}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="flex-1 border-t border-rule" />
              <span className="font-body text-[12px] text-muted">or sign in manually</span>
              <span className="flex-1 border-t border-rule" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-body text-[14px]">
          <div>
            <label className="block text-ink font-medium mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-ink font-medium">Password</label>
              <Link href="/forgot-password" className="text-[12px] text-muted hover:text-ink">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring font-code"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center font-body text-[13px] text-muted border-t border-rule pt-4">
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" className="text-ink font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
