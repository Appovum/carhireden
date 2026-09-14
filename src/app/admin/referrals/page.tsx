// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Referrals & Bonuses Management
// Route: /admin/referrals
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { formatMoney, getCurrencySymbol } from "@/lib/money";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useSiteSettings } from "@/hooks";
import { toast } from "@/components/Toast";

interface ReferralRow {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  referralCode: string;
  referredUserEmail: string;
  referredUserName: string;
  joinedDate: string;
  bonusStatus: "credited" | "pending_qualifying_purchase";
  bonusAmountMinor: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalReferrers: number;
  totalBonusPaidMinor: number;
  defaultBonusMinor: number;
}

export default function AdminReferralsPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const currencySymbol = getCurrencySymbol(default_currency);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalReferrers: 0,
    totalBonusPaidMinor: 0,
    defaultBonusMinor: 0,
  });
  const [loading, setLoading] = useState(true);

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals");
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals || []);
        if (data.stats) {
          setStats(data.stats);
          setRateInput((data.stats.defaultBonusMinor / 100).toFixed(2));
        }
      }
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleSaveRate = async () => {
    const parsedDollars = parseFloat(rateInput);
    if (isNaN(parsedDollars) || parsedDollars < 0) {
      toast.warning("Please enter a valid positive dollar amount.");
      return;
    }
    const amountMinor = Math.round(parsedDollars * 100);

    setSavingRate(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bonus_rate",
          amountMinor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStats((prev) => ({ ...prev, defaultBonusMinor: amountMinor }));
        setIsEditingRate(false);
        toast.success("Bonus rate updated successfully.");
      } else {
        toast.error(data.error || "Failed to update bonus rate.");
      }
    } catch {
      toast.error("Error updating bonus rate.");
    } finally {
      setSavingRate(false);
    }
  };

  const [creditTarget, setCreditTarget] = useState<ReferralRow | null>(null);

  const handleCreditBonus = async (row: ReferralRow) => {
    if (!row.referrerId) return;

    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "credit_bonus",
          referrerId: row.referrerId,
          referredUserId: row.id,
          amountMinor: 500,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditTarget(null);
        fetchReferrals();
      }
    } catch {
      console.error("Failed to credit bonus.");
    }
  };

  const columns: ColumnDef<ReferralRow>[] = [
    {
      key: "referrerEmail",
      header: "Referrer (Inviter)",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink text-[13px]">{r.referrerEmail}</div>
          <div className="text-[11px] font-mono text-muted">Code: {r.referralCode}</div>
        </div>
      ),
    },
    {
      key: "referredUserEmail",
      header: "Referred Friend (Invitee)",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink text-[13px]">{r.referredUserEmail}</div>
          <div className="text-[11px] text-muted">{r.referredUserName}</div>
        </div>
      ),
    },
    {
      key: "joinedDate",
      header: "Signup Date",
      sortable: true,
      render: (r) => new Date(r.joinedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    {
      key: "bonusStatus",
      header: "Bonus Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
            r.bonusStatus === "credited"
              ? "bg-money/10 border-money/20 text-money"
              : "bg-paper-sunken border-rule text-ink font-medium"
          }`}
        >
          {r.bonusStatus === "credited" ? "Credited ($5.00)" : "Pending Purchase"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) =>
        r.bonusStatus !== "credited" ? (
          <button
            onClick={() => setCreditTarget(r)}
            className="px-2.5 py-1 bg-ink text-paper text-[11px] font-medium rounded hover:bg-ink/90 transition-colors"
          >
            Credit $5 Bonus
          </button>
        ) : (
          <span className="text-muted text-[12px]">Bonus Paid</span>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Referrals & Bonuses"
        breadcrumbs={[{ label: "Money", href: "/admin/users" }, { label: "Referrals" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-paper-raised border border-rule rounded space-y-1">
            <span className="text-[12px] font-mono text-muted uppercase">Total Referrals</span>
            {loading ? (
              <div className="h-7 w-12 bg-paper-sunken animate-pulse rounded my-1" />
            ) : (
              <div className="font-display font-bold text-display-sm text-ink">{stats.totalReferrals}</div>
            )}
            <p className="text-[11px] text-muted">Friends who signed up via referral links</p>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded space-y-1">
            <span className="text-[12px] font-mono text-muted uppercase">Active Referrers</span>
            {loading ? (
              <div className="h-7 w-12 bg-paper-sunken animate-pulse rounded my-1" />
            ) : (
              <div className="font-display font-bold text-display-sm text-ink">{stats.totalReferrers}</div>
            )}
            <p className="text-[11px] text-muted">Users actively sharing referral links</p>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded space-y-1">
            <span className="text-[12px] font-mono text-muted uppercase">Bonus Payouts</span>
            {loading ? (
              <div className="h-7 w-20 bg-paper-sunken animate-pulse rounded my-1" />
            ) : (
              <div className="font-display font-bold text-display-sm text-money">
                {formatMoney({ amountMinor: stats.totalBonusPaidMinor, currency: default_currency, exchangeRate: currency_exchange_rate })}
              </div>
            )}
            <p className="text-[11px] text-muted">Total referral cash back bonuses paid</p>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-mono text-muted uppercase">Default Bonus Rate</span>
              {!isEditingRate && !loading && (
                <button
                  onClick={() => setIsEditingRate(true)}
                  className="text-[11px] font-medium text-ink underline hover:text-muted cursor-pointer"
                >
                  Edit Rate
                </button>
              )}
            </div>
            {loading ? (
              <div className="h-7 w-20 bg-paper-sunken animate-pulse rounded my-1" />
            ) : isEditingRate ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="text-[14px] font-bold text-ink">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-20 bg-paper-sunken border border-rule rounded px-2 py-1 text-[13px] font-mono font-bold text-ink"
                />
                <button
                  onClick={handleSaveRate}
                  disabled={savingRate}
                  className="px-2.5 py-1 bg-ink text-paper text-[11px] font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingRate(false)}
                  className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="font-display font-bold text-display-sm text-ink">
                {formatMoney({ amountMinor: stats.defaultBonusMinor, currency: default_currency, exchangeRate: currency_exchange_rate })}
              </div>
            )}
            <p className="text-[11px] text-muted">Per qualifying referral signup</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h2 className="font-display font-bold text-[16px] text-ink">Referral Activity Log</h2>
            <p className="text-[12px] text-muted">
              Every shopper invited by a friend, their referral code, and bonus crediting status.
            </p>
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={referrals}
          loading={loading}
          searchPlaceholder="Search by referrer email, referral code, or friend email..."
          searchField={(r) => `${r.referrerEmail} ${r.referralCode} ${r.referredUserEmail}`}
          pageSize={10}
          exportFilename="referrals_export.csv"
        />
      </main>
    </>
  );
}
