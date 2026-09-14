// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Reset Password Client Component
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ResetPasswordClientProps {
  token: string;
}

export function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage({
        success: false,
        text: "Invalid or missing password reset token. Please request a new link.",
      });
      return;
    }

    if (password.length < 6) {
      setMessage({
        success: false,
        text: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        success: false,
        text: "Passwords do not match. Please enter matching passwords.",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          success: false,
          text: data.message || "Failed to reset password. The link may be expired.",
        });
      } else {
        setMessage({
          success: true,
          text: data.message || "Password successfully reset!",
        });
      }
    } catch {
      setMessage({
        success: false,
        text: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink leading-tight">
          Set new password
        </h1>
        <p className="font-body text-[14px] text-muted">
          Please enter your new password below to update your account
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

      {message?.success ? (
        <div className="space-y-4 pt-2">
          <Link
            href="/login"
            className="block text-center w-full py-3 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors"
          >
            Log in with new password →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-body text-[14px]">
          <div>
            <label className="block text-ink font-medium mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring font-code"
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring font-code"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer disabled:opacity-50"
          >
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>
      )}

      <p className="text-center font-body text-[13px] text-muted border-t border-rule pt-4">
        Back to{" "}
        <Link href="/login" className="text-ink font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
