"use client";

import React, { useState } from "react";
import { StoreCombobox } from "@/components/StoreCombobox";

interface UserClick {
  id: string;
  storeId: string;
  storeName: string;
  createdAt: string;
}

interface StoreItem {
  id: string;
  name: string;
  slug: string;
}

interface ClaimItem {
  id: string;
  orderNumber: string;
  purchaseAmountMinor: number;
  currency: string;
  status?: string;
  createdAt: string;
}

interface ClaimsClientProps {
  userId: string;
  userClicks: UserClick[];
  stores: StoreItem[];
  existingClaims: ClaimItem[];
}

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ClaimsClient({ userId, userClicks, stores, existingClaims }: ClaimsClientProps) {
  const [selectedClickId, setSelectedClickId] = useState<string | null>(userClicks?.[0]?.id || null);
  const [selectedStoreId, setSelectedStoreId] = useState(userClicks?.[0]?.storeId || stores?.[0]?.id || "");
  const [orderNumber, setOrderNumber] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);
  const [claimsList, setClaimsList] = useState(existingClaims);

  const handleSelectClick = (clickId: string) => {
    setSelectedClickId(clickId);
    const clickObj = (userClicks || []).find((c) => c.id === clickId);
    if (clickObj) {
      setSelectedStoreId(clickObj.storeId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !purchaseAmount.trim()) return;

    setLoading(true);
    setMessage(null);

    const amountMinor = Math.round(parseFloat(purchaseAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setMessage({ success: false, text: "Please enter a valid purchase amount." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/account/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          clickId: selectedClickId,
          storeId: selectedStoreId,
          orderNumber: orderNumber.trim(),
          purchaseAmountMinor: amountMinor,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      setMessage({ success: res.ok && data.success, text: data.message || "Claim submitted." });

      if (res.ok && data.success && data.claim) {
        setClaimsList([data.claim, ...claimsList]);
        setOrderNumber("");
        setPurchaseAmount("");
        setNotes("");
        setSelectedClickId(null);
      }
    } catch {
      setMessage({ success: false, text: "Failed to submit cashback claim." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-body text-[14px]">
      {message && (
        <div
          className={`p-3.5 border rounded-[3px] font-body text-[13px] max-w-md ${
            message.success
              ? "bg-money/10 border-money/20 text-money font-medium"
              : "bg-paper-sunken border-rule text-ink"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Step 1: Recent Shopping Clicks */}
        {(userClicks || []).length > 0 ? (
          <div>
            <label className="block text-ink font-medium mb-1.5">
              Select trip or store visit (optional)
            </label>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {(userClicks || []).map((c) => {
                const isSelected = selectedClickId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleSelectClick(c.id)}
                    className={`p-3 border rounded-[3px] text-left transition-colors font-body ${
                      isSelected
                        ? "bg-paper-sunken border-ink text-ink font-medium"
                        : "bg-paper-raised border-rule text-muted hover:text-ink"
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-ink">{c.storeName}</div>
                    <div className="text-[11px] text-muted">{formatDate(c.createdAt)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-md">
            <label className="block text-ink font-medium mb-1">Store name</label>
            <StoreCombobox
              required
              stores={stores || []}
              value={selectedStoreId}
              onChange={(storeId) => setSelectedStoreId(storeId)}
              placeholder="-- Search or select a store --"
            />
          </div>
        )}

        <div>
          <label className="block text-ink font-medium mb-1">Order # or receipt ID</label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink font-mono focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="ORDER-984210"
          />
        </div>

        <div>
          <label className="block text-ink font-medium mb-1">Subtotal amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-muted font-medium">$</span>
            <input
              type="number"
              step="0.01"
              required
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] pl-8 pr-3.5 py-2 text-ink font-mono focus-visible:outline-2 focus-visible:outline-focus-ring"
              placeholder="129.99"
            />
          </div>
        </div>

        <div>
          <label className="block text-ink font-medium mb-1">Additional details or comments</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2 text-ink text-[13px] focus-visible:outline-2 focus-visible:outline-focus-ring"
            placeholder="Items purchased, promo code used, or transaction date..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-ink text-paper font-medium text-[14px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {loading ? "Submitting claim..." : "Submit missing cashback claim"}
        </button>
      </form>

      {/* Existing Claims Table */}
      <div className="space-y-3 pt-4 border-t border-rule">
        <h2 className="font-display font-semibold text-[16px] text-ink">
          Submitted Claims ({claimsList.length})
        </h2>

        {claimsList.length > 0 ? (
          <div className="border border-rule rounded-[3px] overflow-hidden bg-paper-raised">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-paper-sunken text-muted text-[11px] font-medium border-b border-rule">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {claimsList.map((claim) => (
                  <tr key={claim.id}>
                    <td className="p-3 font-mono font-medium text-ink">{claim.orderNumber}</td>
                    <td className="p-3 font-code font-medium text-ink">
                      ${(claim.purchaseAmountMinor / 100).toFixed(2)}
                    </td>
                    <td className="p-3 text-muted">{formatDate(claim.createdAt)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
                          claim.status === "approved"
                            ? "bg-money/10 border-money/20 text-money"
                            : claim.status === "rejected"
                            ? "bg-urgent/10 border-urgent/20 text-urgent"
                            : "bg-paper-sunken border-rule text-muted"
                        }`}
                      >
                        {claim.status === "approved" ? "Approved" : claim.status === "rejected" ? "Rejected" : "Pending review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-paper-sunken border border-rule rounded-[3px] text-center text-muted text-[13px] max-w-md">
            No missing cashback claims submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
