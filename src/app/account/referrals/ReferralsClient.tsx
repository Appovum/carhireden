"use client";

import React, { useState, useEffect } from "react";

interface ReferredUser {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date;
}

interface ReferrerInfo {
  id: string;
  email: string;
  name?: string | null;
  referralCode: string;
}

interface ReferralsClientProps {
  userId: string;
  refLink: string;
  referredUsers: ReferredUser[];
  referrer?: ReferrerInfo | null;
}

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ReferralsClient({
  userId,
  refLink: initialRefLink,
  referredUsers,
  referrer: initialReferrer,
}: ReferralsClientProps) {
  const [copied, setCopied] = useState(false);
  const [refLink, setRefLink] = useState(initialRefLink);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(initialReferrer || null);
  const [inputCode, setInputCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(initialRefLink);
        const dynamicLink = `${window.location.origin}${url.pathname}${url.search}`;
        setRefLink(dynamicLink);
      } catch (e) {
        // Fallback to initial
      }
    }
  }, [initialRefLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setApplying(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/apply-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, referralCode: inputCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ success: false, text: data.message || "Failed to apply referral code." });
      } else {
        setMessage({ success: true, text: data.message });
        if (data.referrer) {
          setReferrer(data.referrer);
        }
        setInputCode("");
      }
    } catch {
      setMessage({ success: false, text: "Network error. Please try again." });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 font-body text-[14px]">
      {/* 1. Referee Status Card — Shows if current user was invited by someone */}
      {referrer ? (
        <div className="p-4 bg-money/10 border border-money/20 rounded-[3px] space-y-1.5 max-w-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-money uppercase tracking-wider">
              Invited By Referrer
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-money/20 text-money uppercase">
              Linked & Verified
            </span>
          </div>
          <div className="font-medium text-ink">
            Invited by <span className="font-bold">{referrer.name || referrer.email}</span>
          </div>
          <div className="text-[12px] text-muted font-mono">
            Referral Code: <code className="font-semibold text-ink">{referrer.referralCode}</code>
          </div>
        </div>
      ) : (
        <form onSubmit={handleApplyReferral} className="p-4 bg-paper-sunken border border-rule rounded-[3px] space-y-3 max-w-md">
          <div>
            <label className="block text-[13px] font-medium text-ink">
              Have a friend&apos;s referral code or email?
            </label>
            <p className="text-[12px] text-muted">
              If you signed up without a referral link, enter your friend&apos;s referral code or email below to link your account.
            </p>
          </div>

          {message && (
            <div
              className={`p-2.5 border rounded-[3px] text-[12px] ${
                message.success
                  ? "bg-money/10 border-money/20 text-money font-medium"
                  : "bg-urgent/10 border-urgent/20 text-urgent font-medium"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="flex-1 bg-paper-raised border border-rule rounded-[3px] px-3.5 py-2 text-ink text-[13px] font-mono focus-visible:outline-2 focus-visible:outline-focus-ring"
              placeholder="e.g. REF12345 or friend@email.com"
            />
            <button
              type="submit"
              disabled={applying}
              className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded-[3px] hover:bg-ink/90 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {applying ? "Linking..." : "Apply Code"}
            </button>
          </div>
        </form>
      )}

      {/* 2. Personal Referral Link Box */}
      <div className="p-4 bg-paper-sunken border border-rule rounded-[3px] space-y-2 max-w-md">
        <label className="block text-[12px] font-medium text-muted">
          Your personal referral link to invite friends
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={refLink}
            className="flex-1 bg-paper-raised border border-rule rounded-[3px] px-3.5 py-2 text-ink text-[13px] font-mono focus-visible:outline-2 focus-visible:outline-focus-ring select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded-[3px] hover:bg-ink/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* 3. Referred Friends List */}
      <div className="space-y-3 pt-4 border-t border-rule">
        <h2 className="font-display font-semibold text-[16px] text-ink">
          Referred Friends ({referredUsers.length})
        </h2>

        {referredUsers.length > 0 ? (
          <div className="border border-rule rounded-[3px] overflow-hidden bg-paper-raised">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-paper-sunken text-muted text-[11px] font-medium border-b border-rule">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3">Bonus Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {referredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3">
                      <div className="font-medium text-ink">{u.name || "Shopper"}</div>
                      <div className="text-[11px] text-muted">{u.email}</div>
                    </td>
                    <td className="p-3 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-money/10 border border-money/20 text-money uppercase">
                        Tracked & Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            No referred friends yet. Share your referral link above to earn bonus cashback when friends join!
          </p>
        )}
      </div>
    </div>
  );
}
