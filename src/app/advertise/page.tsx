// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Self-Serve Advertiser Portal Page
// Route: /advertise
// Fully branched placement flow: Position Boosts (catalog picker) vs Banner Display Slots.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

interface PlacementPlanConfig {
  id: string;
  name: string;
  placementKind: "boost" | "banner";
  dailyRateMinor: number;
  description: string;
  requiredDimensions?: string;
  targetType?: "store" | "coupon";
}

interface StoreItem {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
}

interface CouponItem {
  id: string;
  title: string;
  code?: string;
  storeName: string;
}

function ConfettiEffect() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#10B981", "#059669", "#34D399", "#111827", "#F59E0B", "#6EE7B7"];
    const particleCount = 85;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 180,
      y: canvas.height * 0.35 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
    }));

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.98;
        p.rotation += p.rSpeed;
        p.opacity -= 0.007;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (alive) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" />;
}

function AdvertiseContent() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const statusParam = searchParams.get("status");

  const [inspectingOrder, setInspectingOrder] = useState<any>(null);

  // Form State
  const [advertiserEmail, setAdvertiserEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [placements, setPlacements] = useState<PlacementPlanConfig[]>([]);
  const [durations, setDurations] = useState<number[]>([7, 14, 30, 60]);
  const [paymentMethods, setPaymentMethods] = useState<{ stripeEnabled: boolean; paypalEnabled: boolean }>({
    stripeEnabled: true,
    paypalEnabled: true,
  });

  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [paymentGateway, setPaymentGateway] = useState<"stripe" | "paypal">("stripe");

  // Catalog Pickers for Boosts
  const [storeQuery, setStoreQuery] = useState("");
  const [storeResults, setStoreResults] = useState<StoreItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);

  const [couponQuery, setCouponQuery] = useState("");
  const [couponResults, setCouponResults] = useState<CouponItem[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponItem | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; checkoutUrl?: string; message?: string; error?: string } | null>(null);

  // Inspect order status if returning from payment gateway
  useEffect(() => {
    if (orderId && statusParam === "success") {
      fetch(`/api/advertise/confirm?orderId=${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setInspectingOrder(data.order);
          }
        })
        .catch(console.error);
    }
  }, [orderId, statusParam]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/advertise/config");
        const data = await res.json();
        if (data.success) {
          if (data.placements && data.placements.length > 0) {
            setPlacements(data.placements);
            setSelectedPlacementId(data.placements[0].id);
          }
          if (data.durations && data.durations.length > 0) {
            setDurations(data.durations);
            setSelectedDuration(data.durations[0]);
          }
          if (data.paymentMethods) {
            setPaymentMethods(data.paymentMethods);
            if (!data.paymentMethods.stripeEnabled && data.paymentMethods.paypalEnabled) {
              setPaymentGateway("paypal");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load advertise config:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Store Autocomplete Search Effect
  useEffect(() => {
    if (!storeQuery.trim()) {
      setStoreResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/stores/search?q=${encodeURIComponent(storeQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setStoreResults(data.stores || []);
        })
        .catch(console.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [storeQuery]);

  // Coupon Autocomplete Search Effect
  useEffect(() => {
    if (!couponQuery.trim()) {
      setCouponResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/coupons/search?q=${encodeURIComponent(couponQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setCouponResults(data.coupons || []);
        })
        .catch(console.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [couponQuery]);

  const activePlacement = placements.find((p) => p.id === selectedPlacementId) || placements[0] || {
    id: "featured_store",
    name: "Featured Store Placement",
    placementKind: "boost",
    dailyRateMinor: 1800,
    targetType: "store",
  };

  const isBoost = activePlacement.placementKind === "boost";
  const totalPriceMinor = selectedDuration * activePlacement.dailyRateMinor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBoost) {
      if (activePlacement.targetType === "store" && !selectedStore) {
        setResult({ success: false, error: "Please search and select your store from the catalog picker." });
        return;
      }
      if (activePlacement.targetType === "coupon" && !selectedCoupon) {
        setResult({ success: false, error: "Please search and select your offer from the catalog picker." });
        return;
      }
    }

    if (!advertiserEmail || !advertiserEmail.includes("@")) {
      setResult({ success: false, error: "Please enter a valid advertiser email address." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/advertise/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiserEmail,
          brandName: isBoost ? selectedStore?.name || brandName : brandName,
          durationDays: selectedDuration,
          planType: selectedPlacementId,
          storeId: selectedStore?.id,
          couponId: selectedCoupon?.id,
          paymentGateway,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setResult({ success: false, message: "Checkout initiation failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (statusParam === "success" || inspectingOrder) {
    const isPaid = inspectingOrder?.paymentStatus === "paid";
    const magicToken = inspectingOrder?.magicToken;

    return (
      <>
        {isPaid && <ConfettiEffect />}
        <section className="bg-paper-raised border border-rule rounded-[4px] p-8 sm:p-12 space-y-6 text-center max-w-xl mx-auto my-8 relative z-10 font-body">
          <div className="w-14 h-14 rounded-full bg-money/10 border border-money/30 flex items-center justify-center mx-auto text-money text-3xl font-bold">
            ✓
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-[24px] sm:text-[28px] text-ink">
              {isPaid ? "Payment Confirmed! Order Submitted." : "Order Submitted (Payment Verification Pending)"}
            </h2>
            <p className="font-body text-[14px] text-muted max-w-md mx-auto">
              {isPaid
                ? "Thank you for advertising with CouponPilot. Your placement order has been processed."
                : "Your order has been created. Once our payment gateway webhook verifies settlement, your campaign will transition automatically."}
            </p>
          </div>

          {orderId && (
            <div className="p-4 bg-paper-sunken border border-rule rounded-[3px] space-y-2 font-mono text-[13px] text-left">
              <div className="flex justify-between border-b border-rule/50 pb-2">
                <span className="text-muted font-body font-medium">Order ID:</span>
                <span className="text-ink font-semibold truncate max-w-[240px]">{orderId}</span>
              </div>
              <div className="flex justify-between border-b border-rule/50 pb-2">
                <span className="text-muted font-body font-medium">Payment Status:</span>
                <span
                  className={`font-semibold uppercase ${
                    isPaid ? "text-money" : "text-ink"
                  }`}
                >
                  {inspectingOrder?.paymentStatus || "PENDING VERIFICATION"}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-muted font-body font-medium">Campaign Status:</span>
                <span className="text-ink font-semibold uppercase">
                  {inspectingOrder?.campaignStatus?.replace(/_/g, " ") || "PROCESSING"}
                </span>
              </div>
            </div>
          )}

          {magicToken && (
            <div className="p-4 bg-money/10 border border-money/30 rounded-[3px] text-left space-y-2 text-[13px]">
              <div className="font-semibold text-money">Advertiser Portal Access Link</div>
              <p className="text-ink text-[12px]">
                Access your Advertiser Portal anytime to manage artwork, track live clicks & view receipts:
              </p>
              <a
                href={`/advertiser?token=${magicToken}`}
                className="inline-block font-mono text-[12px] font-semibold text-money underline break-all"
              >
                /advertiser?token={magicToken}
              </a>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href="/advertise"
              className="px-5 py-2.5 bg-ink text-paper text-[13px] font-medium rounded-[3px] hover:bg-ink/90 transition-colors"
            >
              Create another campaign
            </a>
            <a
              href="/stores"
              className="px-5 py-2.5 bg-paper-sunken border border-rule text-ink text-[13px] font-medium rounded-[3px] hover:bg-paper-raised transition-colors"
            >
              View directory
            </a>
          </div>
        </section>
      </>
    );
  }

  return (
    <section className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8 space-y-6">
      {result && (
        <div
          className={`p-3.5 border rounded-[3px] font-body text-[13px] ${
            result.success
              ? "bg-money/10 border-money/20 text-money font-medium"
              : "bg-paper-sunken border-rule text-ink font-medium"
          }`}
        >
          {result.error
            ? `Payment Gateway Error: ${result.error}`
            : result.message || (result.success ? "Redirecting to payment gateway..." : "Payment failed.")}
        </div>
      )}

      {loadingConfig ? (
        <div className="p-8 text-center text-muted font-mono text-[13px]">
          Loading placement configurations...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-body text-[14px] max-w-md mx-auto">
          <div>
            <label className="block text-ink font-medium mb-1">Advertiser Email</label>
            <input
              type="email"
              required
              value={advertiserEmail}
              onChange={(e) => setAdvertiserEmail(e.target.value)}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
              placeholder="advertiser@company.com"
            />
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">Placement Type</label>
            <select
              value={selectedPlacementId}
              onChange={(e) => {
                setSelectedPlacementId(e.target.value);
                setSelectedStore(null);
                setSelectedCoupon(null);
              }}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <optgroup label="Position Boosts (Directory & Deals)">
                {placements
                  .filter((p) => p.placementKind === "boost")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMoney({ amountMinor: p.dailyRateMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}/day)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Banner Display Slots (Artwork Upload Required)">
                {placements
                  .filter((p) => p.placementKind === "banner")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMoney({ amountMinor: p.dailyRateMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}/day)
                    </option>
                  ))}
              </optgroup>
            </select>
            {activePlacement.description && (
              <p className="text-[12px] text-muted mt-1">{activePlacement.description}</p>
            )}
          </div>

          {/* BRANCH 1: Position Boost Catalog Picker */}
          {isBoost ? (
            <div className="space-y-3 p-4 bg-paper-sunken/60 border border-rule rounded-[3px]">
              <div className="text-[13px] font-semibold text-ink">
                Select target {activePlacement.targetType === "store" ? "Store" : "Offer"} from Catalog
              </div>

              {activePlacement.targetType === "store" ? (
                <div className="space-y-2">
                  {selectedStore ? (
                    <div className="p-3 bg-paper-raised border border-rule rounded flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink">{selectedStore.name}</div>
                        <div className="text-[11px] text-muted font-mono">{selectedStore.domain}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStore(null)}
                        className="text-[11px] font-medium text-muted hover:text-ink"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={storeQuery}
                        onChange={(e) => setStoreQuery(e.target.value)}
                        placeholder="Search store by name or domain..."
                        className="w-full bg-paper border border-rule rounded px-3 py-2 text-ink text-[13px]"
                      />
                      {storeResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-paper-raised border border-rule rounded shadow-lg max-h-48 overflow-y-auto">
                          {storeResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStore(s);
                                setBrandName(s.name);
                                setStoreResults([]);
                                setStoreQuery("");
                              }}
                              className="w-full text-left p-2.5 hover:bg-paper-sunken border-b border-rule/50 flex items-center justify-between text-[13px]"
                            >
                              <span className="font-medium text-ink">{s.name}</span>
                              <span className="text-[11px] text-muted font-mono">{s.domain}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCoupon ? (
                    <div className="p-3 bg-paper-raised border border-rule rounded flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink">{selectedCoupon.title}</div>
                        <div className="text-[11px] text-muted">{selectedCoupon.storeName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCoupon(null)}
                        className="text-[11px] font-medium text-muted hover:text-ink"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={couponQuery}
                        onChange={(e) => setCouponQuery(e.target.value)}
                        placeholder="Search offer title or promo code..."
                        className="w-full bg-paper border border-rule rounded px-3 py-2 text-ink text-[13px]"
                      />
                      {couponResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-paper-raised border border-rule rounded shadow-lg max-h-48 overflow-y-auto">
                          {couponResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCoupon(c);
                                setBrandName(c.storeName);
                                setCouponResults([]);
                                setCouponQuery("");
                              }}
                              className="w-full text-left p-2.5 hover:bg-paper-sunken border-b border-rule/50 text-[13px]"
                            >
                              <div className="font-medium text-ink">{c.title}</div>
                              <div className="text-[11px] text-muted">{c.storeName}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* BRANCH 2: Banner Display Slot Form */
            <div>
              <label className="block text-ink font-medium mb-1">Brand / Merchant Name</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                placeholder="e.g. Nike"
              />
              <p className="text-[12px] text-muted mt-1 font-mono">
                Required Banner Dimensions: <strong>{activePlacement.requiredDimensions || "728x90"}</strong> pixels.
              </p>
            </div>
          )}

          <div>
            <label className="block text-ink font-medium mb-1">Campaign Duration</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-focus-ring font-code"
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} days ({formatMoney({ amountMinor: d * activePlacement.dailyRateMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1 font-mono">
              Note: Your {selectedDuration}-day campaign window begins from the moment of Admin Approval & Activation.
            </p>
          </div>

          {/* Payment Gateway Selector */}
          <div>
            <label className="block text-ink font-medium mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {paymentMethods.stripeEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentGateway("stripe")}
                  className={`p-3.5 rounded-[3px] border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentGateway === "stripe"
                      ? "bg-paper-raised border-ink ring-1 ring-ink font-semibold"
                      : "bg-paper-sunken border-rule hover:border-rule-strong"
                  }`}
                >
                  <div className="flex items-center justify-center h-6">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
                      alt="Stripe"
                      className="h-5 w-auto object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-muted">Credit Card, Apple Pay</span>
                </button>
              )}

              {paymentMethods.paypalEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentGateway("paypal")}
                  className={`p-3.5 rounded-[3px] border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentGateway === "paypal"
                      ? "bg-paper-raised border-ink ring-1 ring-ink font-semibold"
                      : "bg-paper-sunken border-rule hover:border-rule-strong"
                  }`}
                >
                  <div className="flex items-center justify-center h-6">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                      alt="PayPal"
                      className="h-5 w-auto object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-muted">PayPal Account / Express</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-paper-sunken border border-rule p-4 rounded-[3px] flex items-center justify-between mt-2">
            <span className="text-muted font-medium">Total price:</span>
            <span className="font-display font-bold text-[22px] text-ink">
              {formatMoney({ amountMinor: totalPriceMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-ink text-paper font-medium text-[15px] rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {submitting
              ? "Proceeding to gateway..."
              : `Pay with ${paymentGateway === "paypal" ? "PayPal" : "Stripe"} (${formatMoney(
                  { amountMinor: totalPriceMinor, currency: default_currency },
                  "en-US",
                  2,
                  currency_exchange_rate
                )})`}
          </button>
        </form>
      )}
    </section>
  );
}

export default function AdvertisePage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:py-14 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display font-bold text-[28px] sm:text-[34px] text-ink">
          Promote your brand
        </h1>
        <p className="font-body text-[14px] text-muted max-w-lg mx-auto">
          Position boosts and banner slot placements across directory headers, store pages, and top deal spots.
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-muted font-mono text-[13px]">Loading...</div>}>
        <AdvertiseContent />
      </Suspense>
    </main>
  );
}
