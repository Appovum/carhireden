// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Signup Client Component
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface SignupClientProps {
  initialRef?: string;
}

export function SignupClient({ initialRef = "" }: SignupClientProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referredByCode, setReferredByCode] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    if (!referredByCode) {
      // Check Cookie / LocalStorage fallback
      const match = document.cookie.match(/(?:^|; )cp_ref_code=([^;]*)/);
      if (match && match[1]) {
        setReferredByCode(decodeURIComponent(match[1]));
      } else {
        try {
          const stored = localStorage.getItem("cp_ref_code");
          if (stored) setReferredByCode(stored);
        } catch (e) {
          // Storage disabled
        }
      }
    }
  }, [referredByCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          referredByCode: referredByCode ? referredByCode.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ success: false, text: data.message || "Registration failed." });
      } else {
        setMessage({
          success: true,
          text: "Account created successfully! Redirecting...",
        });
        setTimeout(() => {
          window.location.href = "/account";
        }, 1000);
      }
    } catch {
      setMessage({ success: false, text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink leading-tight">
          Create your account
        </h1>
        <p className="font-body text-[14px] text-muted">
          Track cashback on verified offers and manage your earnings
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 border rounded-[3px] font-body text-[13px] ${
            message.success
              ? "bg-money/10 border-money/20 text-money font-medium"
              : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-body text-[14px]">
        <div>
          <label className="block text-ink font-medium mb-1">Full name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="Jane Doe"
          />
        </div>

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
          <label className="block text-ink font-medium mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring font-code"
            placeholder="••••••••••••"
          />
        </div>

        <div>
          <label className="block text-ink font-medium mb-1">
            Referral Code <span className="text-muted font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={referredByCode}
            onChange={(e) => setReferredByCode(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink font-mono focus-visible:outline-2 focus-visible:outline-focus-ring uppercase text-[13px]"
            placeholder="e.g. REF12345"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center font-body text-[13px] text-muted border-t border-rule pt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-ink font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
