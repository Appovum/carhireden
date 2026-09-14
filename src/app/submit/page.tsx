// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Merchant Offer Submission Page
// Route: /submit
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";

export default function SubmitOfferPage() {
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/coupons/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          logoUrl,
          title,
          code,
          discountText,
          destinationUrl,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit offer.");
      }

      setMessage({
        success: true,
        text: "Offer submitted successfully! Our moderation team will review it shortly.",
      });

      setStoreName("");
      setLogoUrl("");
      setTitle("");
      setCode("");
      setDiscountText("");
      setDestinationUrl("");
      setDescription("");
    } catch (err: any) {
      setMessage({
        success: false,
        text: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6 font-body">
      <section className="bg-paper-raised border border-rule p-6 sm:p-8 rounded-[4px] space-y-6">
        <div>
          <h1 className="font-display font-bold text-[24px] sm:text-[28px] text-ink">
            Submit a Promo Code or Deal
          </h1>
          <p className="text-[14px] text-muted mt-1">
            Found a working coupon or offer? Share it with the CouponPilot community.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-[4px] text-[13px] border ${
              message.success
                ? "bg-money/10 border-money/20 text-money"
                : "bg-urgent/10 border-urgent/20 text-urgent"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Store or Merchant Name <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Nike, Sephora, Amazon"
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Store Logo URL (Optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://store.com/logo.png (leave blank to auto-detect)"
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Offer Title <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20% Off Storewide"
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1">
                Coupon Code (Optional if Deal)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SAVE20"
                className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink font-mono placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring uppercase"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink mb-1">
                Discount Amount/Text
              </label>
              <input
                type="text"
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                placeholder="e.g. 20% OFF or $15 OFF"
                className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Deal URL
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://store.com/sale"
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Offer Description or Restrictions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details such as minimum spend, exclusions, or expiration details..."
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-ink text-paper font-medium text-[15px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {loading ? "Submitting Offer..." : "Submit Offer for Moderation →"}
          </button>
        </form>
      </section>
    </main>
  );
}
