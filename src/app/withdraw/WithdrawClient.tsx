"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSiteSettings } from "@/hooks";
import { formatCurrency } from "@/utils/format";

interface WithdrawClientProps {
  userId: string;
  userEmail: string;
  confirmedBalance: number;
  hasPendingWithdrawal?: boolean;
}

export function WithdrawClient({
  userId,
  userEmail,
  confirmedBalance,
  hasPendingWithdrawal = false,
}: WithdrawClientProps) {
  const { default_currency, currency_exchange_rate, min_withdrawal } = useSiteSettings();
  const minVal = parseFloat(min_withdrawal) || 10.0;
  const [amount, setAmount] = useState(confirmedBalance >= minVal ? minVal.toFixed(2) : "0.00");
  const [payoutChannel, setPayoutChannel] = useState("PAYPAL");
  const [payoutTarget, setPayoutTarget] = useState(userEmail);

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(hasPendingWithdrawal);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(
    hasPendingWithdrawal
      ? { success: true, text: "A withdrawal request is currently pending admin review. Payment will be processed within 24 business hours." }
      : null
  );

  // Update target placeholder/value defaults when payout channel changes
  useEffect(() => {
    if (payoutChannel === "BANK_TRANSFER") {
      setPayoutTarget("");
    } else {
      if (!payoutTarget || payoutTarget.length < 3) {
        setPayoutTarget(userEmail);
      }
    }
  }, [payoutChannel, userEmail]);

  const getTargetConfig = () => {
    switch (payoutChannel) {
      case "BANK_TRANSFER":
        return {
          label: "Bank Account Number, ACH Routing, or IBAN",
          placeholder: "e.g. IBAN / Routing #123456789 Acc #987654321",
          type: "text",
        };
      case "GIFT_CARD":
        return {
          label: "Recipient Email Address for Amazon E-Gift Card",
          placeholder: "e.g. yourname@gmail.com",
          type: "email",
        };
      case "PAYPAL":
      default:
        return {
          label: "PayPal Account Email Address",
          placeholder: "e.g. yourname@paypal.com",
          type: "email",
        };
    }
  };

  const targetConfig = getTargetConfig();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || loading) return;

    setLoading(true);
    setMessage(null);

    const amountMinor = Math.round(parseFloat(amount || "0") * 100);

    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          userId,
          amountMinor,
          payoutChannel,
          payoutTarget,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setIsSubmitted(true);
        setMessage({ success: true, text: data.message || "Withdrawal request submitted successfully!" });
      } else {
        setMessage({ success: false, text: data.message || "Withdrawal request failed." });
      }
    } catch {
      setMessage({ success: false, text: "Withdrawal request failed." });
    } finally {
      setLoading(false);
    }
  };

  const isPositiveBalance = confirmedBalance > 0;

  return (
    <div className="space-y-6 font-body text-[14px]">
      <div
        className={`p-4 border rounded-[3px] flex items-center justify-between font-body ${
          isPositiveBalance
            ? "bg-money/10 border-money/20 text-money"
            : "bg-paper-sunken border-rule text-muted"
        }`}
      >
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider opacity-80">
            Confirmed ready balance
          </div>
          <div className="font-display font-bold text-[28px] tabular-nums">
            {formatCurrency(confirmedBalance, default_currency, currency_exchange_rate)}
          </div>
        </div>
        <div className="text-right text-[12px] text-muted">
          Minimum payout: <span className="font-semibold text-ink">{formatCurrency(minVal, default_currency, currency_exchange_rate)}</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 border rounded-[3px] font-body text-[13px] max-w-md ${
            message.success
              ? "bg-money/10 border-money/20 text-money font-medium"
              : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
          }`}
        >
          {message.text}
        </div>
      )}

      {!isSubmitted ? (
        <form onSubmit={handleWithdraw} className="space-y-4 max-w-md">
          <div>
            <label className="block text-ink font-medium mb-1">Withdrawal amount ({default_currency})</label>
            <input
              type="number"
              step="0.01"
              min={minVal.toFixed(2)}
              max={confirmedBalance > 0 ? confirmedBalance : minVal}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full max-w-md bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink font-code text-[16px] focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">Payout channel</label>
            <select
              value={payoutChannel}
              onChange={(e) => setPayoutChannel(e.target.value)}
              className="w-full max-w-md bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink font-body focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <option value="PAYPAL">PayPal</option>
              <option value="BANK_TRANSFER">Direct Bank Transfer (ACH / Wire)</option>
              <option value="GIFT_CARD">Amazon E-Gift Card</option>
            </select>
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">{targetConfig.label}</label>
            <input
              type={targetConfig.type}
              placeholder={targetConfig.placeholder}
              required
              value={payoutTarget}
              onChange={(e) => setPayoutTarget(e.target.value)}
              className="w-full max-w-md bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink font-code text-[14px] focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading || confirmedBalance < 10}
            className={`w-full py-3 text-white font-medium text-[15px] rounded-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
              confirmedBalance >= 10
                ? "bg-money hover:bg-money/90 cursor-pointer"
                : "bg-muted/50 cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : "Confirm and submit withdrawal request"}
          </button>
        </form>
      ) : (
        <div className="pt-2 max-w-md">
          <Link
            href="/wallet"
            className="inline-block px-5 py-2.5 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors"
          >
            ← Return to wallet dashboard
          </Link>
        </div>
      )}

      <p className="text-center text-[12px] text-muted border-t border-rule pt-4 max-w-md">
        Payout requests are processed within 24 business hours. Need to change payout options?{" "}
        <Link href="/account" className="text-ink font-semibold hover:underline">
          Edit profile settings
        </Link>
      </p>
    </div>
  );
}
