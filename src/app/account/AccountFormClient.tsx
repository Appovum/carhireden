"use client";

import React, { useState } from "react";
import { toast } from "@/components/Toast";

interface AccountFormClientProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export function AccountFormClient({ user }: AccountFormClientProps) {
  const [name, setName] = useState(user.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("paypal");
  const [payoutDetails, setPayoutDetails] = useState(user.email);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name,
          newPassword: newPassword || undefined,
          payoutMethod,
          payoutDetails,
        }),
      });
      const data = await res.json();
      setMessage({ success: res.ok && data.success, text: data.message || "Profile settings updated successfully." });
      if (res.ok && data.success) {
        setNewPassword("");
      }
    } catch {
      setMessage({ success: false, text: "Failed to update profile settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_account",
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Account deleted.");
        window.location.href = "/";
      } else {
        toast.error(data.message || "Deletion failed.");
      }
    } catch {
      toast.error("Account deletion request failed.");
    } finally {
      setLoading(false);
    }
  };

  const getPayoutConfig = () => {
    switch (payoutMethod) {
      case "bank":
        return {
          label: "Bank Account Number, ACH Routing, or IBAN",
          placeholder: "e.g. IBAN / Routing #123456789 Acc #987654321",
          type: "text",
        };
      case "gift_card":
        return {
          label: "Recipient Email Address for Amazon E-Gift Card",
          placeholder: "you@example.com",
          type: "email",
        };
      case "paypal":
      default:
        return {
          label: "PayPal Account Email Address",
          placeholder: "you@example.com",
          type: "email",
        };
    }
  };

  const payoutConfig = getPayoutConfig();

  const handleChannelChange = (newMethod: string) => {
    setPayoutMethod(newMethod);
    if (newMethod === "bank") {
      if (payoutDetails.includes("@")) {
        setPayoutDetails("");
      }
    } else {
      if (!payoutDetails || !payoutDetails.includes("@")) {
        setPayoutDetails(user.email);
      }
    }
  };

  return (
    <div className="space-y-6 font-body text-[14px]">
      {message && (
        <div
          className={`p-3 border rounded-[3px] font-body text-[13px] max-w-md ${
            message.success
              ? "bg-money/10 border-money/20 text-money font-medium"
              : "bg-paper-sunken border-rule text-ink"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
        <div>
          <label className="block text-ink font-medium mb-1">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-ink font-medium mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="New password (optional)"
          />
        </div>

        <div className="border-t border-rule pt-4 space-y-3">
          <h2 className="font-display font-semibold text-[16px] text-ink">
            Where should we send your payouts?
          </h2>
          <p className="text-[13px] text-muted">
            Your details are encrypted and only used to send your earnings.
          </p>

          <div>
            <label className="block text-ink font-medium mb-1">Payout channel</label>
            <select
              value={payoutMethod}
              onChange={(e) => handleChannelChange(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3 py-2 text-ink font-body focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <option value="paypal">PayPal</option>
              <option value="bank">Direct Bank Transfer / IBAN</option>
              <option value="gift_card">Amazon E-Gift Card</option>
            </select>
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">{payoutConfig.label}</label>
            <input
              type={payoutConfig.type}
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink font-code focus-visible:outline-2 focus-visible:outline-focus-ring"
              placeholder={payoutConfig.placeholder}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {loading ? "Saving..." : "Save settings"}
        </button>
      </form>

      {/* Account Erasure */}
      <div className="border-t border-rule pt-6 space-y-2 max-w-md">
        <h3 className="font-display font-semibold text-[15px] text-ink">
          Account removal
        </h3>
        <p className="text-[13px] font-body text-muted">
          Permanently close your account and delete your stored profile data.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="px-4 py-2 bg-paper-sunken border border-rule text-ink hover:bg-paper-sunken/80 text-[12px] font-body font-medium rounded-[3px] transition-colors"
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}
