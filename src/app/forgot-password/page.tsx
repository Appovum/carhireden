// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Forgot Password Page
// Route: /forgot-password
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          success: false,
          text: data.message || "Failed to send reset link. Please try again.",
        });
      } else {
        setMessage({
          success: true,
          text: data.message || "Instructions to reset your password have been sent to your email.",
        });
      }
    } catch {
      setMessage({
        success: false,
        text: "Network error. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-14 flex items-center justify-center w-full">
      <div className="w-full max-w-md bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink leading-tight">
            Reset your password
          </h1>
          <p className="font-body text-[14px] text-muted">
            Enter your registered email address and we&apos;ll send you instructions to reset your password.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer disabled:opacity-50"
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <p className="text-center font-body text-[13px] text-muted border-t border-rule pt-4">
          Remembered your password?{" "}
          <Link href="/login" className="text-ink font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
