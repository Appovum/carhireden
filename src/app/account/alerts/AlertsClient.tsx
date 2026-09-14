// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Account Deal Alerts Client Component
// Handles keyword deal alert subscriptions and active alert management.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import { toast } from "@/components/Toast";

interface SubscriptionItem {
  id: string;
  keyword: string;
  storeName?: string;
  createdAt: string;
}

interface AlertsClientProps {
  userId: string;
  initialSubscriptions: SubscriptionItem[];
}

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function AlertsClient({ userId, initialSubscriptions }: AlertsClientProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(initialSubscriptions);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          userId,
          keyword: keyword.trim(),
        }),
      });
      const data = await res.json();
      setMessage({ success: res.ok && data.success, text: data.message || "Alert subscription saved." });

      if (res.ok && data.success && data.alert) {
        const newSub: SubscriptionItem = {
          id: data.alert.id,
          keyword: data.alert.targetDiscount || keyword,
          storeName: data.alert.store?.name,
          createdAt: typeof data.alert.createdAt === "string" ? data.alert.createdAt : new Date().toISOString(),
        };
        setSubscriptions((prev) => [newSub, ...prev]);
        setKeyword("");
      }
    } catch {
      setMessage({ success: false, text: "Failed to save alert subscription." });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (subId: string) => {
    try {
      const res = await fetch("/api/account/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unsubscribe",
          alertId: subId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscriptions(subscriptions.filter((s) => s.id !== subId));
        toast.success("Unsubscribed successfully.");
      }
    } catch {
      toast.error("Failed to unsubscribe.");
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

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-ink font-medium mb-1">Store name or keyword</label>
          <input
            type="text"
            required
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full max-w-md bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="e.g. Nike, Sneakers, Apple, 50% OFF"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {loading ? "Subscribing..." : "Subscribe to deal alert"}
        </button>
      </form>

      {/* Active Subscriptions List */}
      <div className="space-y-3 pt-4 border-t border-rule">
        <h2 className="font-display font-semibold text-[16px] text-ink">Active alert subscriptions</h2>

        {subscriptions.length > 0 ? (
          <div className="space-y-2 max-w-md">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-3 bg-paper-raised border border-rule rounded-[3px] flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-ink text-[14px]">
                    {sub.keyword} {sub.storeName ? `(${sub.storeName})` : ""}
                  </div>
                  <div className="text-[12px] text-muted">
                    Subscribed on {formatDate(sub.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnsubscribe(sub.id)}
                  className="px-2.5 py-1 text-[12px] text-muted hover:text-ink border border-rule rounded bg-paper-sunken transition-colors"
                >
                  Unsubscribe
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-paper-sunken border border-rule rounded-[3px] text-center text-muted text-[13px] max-w-md">
            No active deal alerts. Subscribe above to get notified when new offers are posted.
          </div>
        )}
      </div>
    </div>
  );
}
