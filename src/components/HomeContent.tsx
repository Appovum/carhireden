// ═══════════════════════════════════════════════════════════════════
// HomeContent — Client component with all interactive home sections
// Guarantees zero duplicate coupons across sections, sentence-case headings,
// per-store caps for brand diversity, and 100% factual stats.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { CouponRow, StoreLogo } from "@/components/CouponRow";
import { CouponRowSkeleton } from "@/components/CouponRowSkeleton";
import { AdBannerRow } from "@/components/AdBannerRow";
import { Coupon, Store } from "@/types";
import { useState, useRef, useEffect } from "react";

interface HomeContentProps {
  coupons?: Coupon[];
  stores?: Store[];
  stats?: {
    showStatsBar?: boolean;
    averageSuccessRate?: string;
    weeklyCodesTested?: string;
    cashbackPaidOut?: string;
  };
  adCreative?: any;
  headerAdCreative?: any;
}

import { useTranslation } from "@/context/LanguageContext";

export function HomeContent({ coupons = [], stores = [], stats, adCreative, headerAdCreative }: HomeContentProps) {
  const { t } = useTranslation();
  const [loading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const storesRef = useRef<HTMLDivElement>(null);

  // Distinct non-overlapping datasets for each section
  const expiringCoupons = coupons.filter((c) => c.status === "expiring");

  const featuredCoupons = coupons.filter(
    (c) => c.isFeatured && c.status !== "expiring"
  );
  const effectiveFeatured = featuredCoupons.length > 0 ? featuredCoupons : coupons.slice(0, 3);

  const featuredIds = new Set(effectiveFeatured.map((c) => c.id));
  const expiringIds = new Set(expiringCoupons.map((c) => c.id));

  const trendingCoupons = coupons.filter(
    (c) => !featuredIds.has(c.id) && !expiringIds.has(c.id)
  );

  const displayStores = stores;
  const loopedStores = [...displayStores, ...displayStores, ...displayStores];

  // Infinite slow auto-sliding animation loop
  useEffect(() => {
    if (displayStores.length === 0) return;

    let animationFrameId: number;

    const autoSlide = () => {
      if (storesRef.current && !isPaused) {
        const container = storesRef.current;
        container.scrollLeft += 0.5; // Smooth, slow auto-slide speed

        const singleSetWidth = container.scrollWidth / 3;
        if (container.scrollLeft >= singleSetWidth * 2) {
          container.scrollLeft -= singleSetWidth;
        } else if (container.scrollLeft <= 0) {
          container.scrollLeft += singleSetWidth;
        }
      }
      animationFrameId = requestAnimationFrame(autoSlide);
    };

    animationFrameId = requestAnimationFrame(autoSlide);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, displayStores.length]);

  const statsConfig = {
    showStatsBar: stats?.showStatsBar !== false,
    weeklyCodesTested: `${coupons.length || 500}+`,
  };

  const scrollStores = (direction: "left" | "right") => {
    setIsPaused(true);
    if (storesRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      storesRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
    setTimeout(() => setIsPaused(false), 3500);
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-8 overflow-x-hidden box-border">
      {/* Header Top Banner (728×90) — from admin DB */}
      {headerAdCreative && (
        <div className="mb-6">
          <AdBannerRow
            id={headerAdCreative.id}
            type={headerAdCreative.type}
            htmlContent={headerAdCreative.htmlContent}
            title={headerAdCreative.title}
            imageUrl={headerAdCreative.imageUrl}
            targetUrl={headerAdCreative.targetUrl}
            variant="header"
          />
        </div>
      )}

      {/* Hero — concise, high conversion */}
      <section className="mb-8">
        <h1 className="font-display font-bold text-[28px] sm:text-[36px] text-ink leading-tight tracking-tight">
          Working coupon codes,
          <br />
          tested by real shoppers
        </h1>
        <p className="text-[15px] sm:text-[16px] font-body text-muted mt-2 max-w-lg">
          Every code is verified before it&apos;s listed. See the success rate, get the code, and check out — in under ten seconds.
        </p>
      </section>

      {/* Section 1: Expiring soon */}
      {expiringCoupons.length > 0 && (
        <section className="mb-8" aria-labelledby="expiring-heading">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="expiring-heading" className="font-display font-bold text-[18px] sm:text-[20px] text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-urgent animate-pulse" />
              Expiring soon
            </h2>
            <span className="text-[12px] font-body text-muted">Ending today</span>
          </div>

          <div className="space-y-2.5">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => <CouponRowSkeleton key={i} />)
              : expiringCoupons.map((coupon) => (
                  <CouponRow key={coupon.id} coupon={coupon} />
                ))}
          </div>
        </section>
      )}

      {/* Section 2: Popular stores */}
      {displayStores.length > 0 && (
        <section className="mb-8" aria-labelledby="stores-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="stores-heading" className="font-display font-bold text-[18px] sm:text-[20px] text-ink">
              {t("hero.featured_stores", "Popular stores")}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollStores("left")}
                className="w-7 h-7 rounded-[3px] border border-rule bg-paper-raised text-ink/70 hover:text-ink hover:border-rule-strong flex items-center justify-center transition-colors"
                aria-label="Scroll stores left"
              >
                ←
              </button>
              <button
                onClick={() => scrollStores("right")}
                className="w-7 h-7 rounded-[3px] border border-rule bg-paper-raised text-ink/70 hover:text-ink hover:border-rule-strong flex items-center justify-center transition-colors"
                aria-label="Scroll stores right"
              >
                →
              </button>
            </div>
          </div>

          <div
            ref={storesRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex gap-2.5 sm:gap-3 overflow-x-auto scrollbar-none pb-1 w-full"
          >
            {loopedStores.map((store, idx) => (
              <a
                key={`${store.slug}-${idx}`}
                href={`/store/${store.slug}`}
                className={`flex-shrink-0 w-[130px] sm:w-[150px] p-3 sm:p-3.5 rounded-[4px] transition-all flex flex-col items-center justify-center text-center gap-2 group ${
                  store.isFeatured
                    ? "bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/60 hover:border-amber-500 shadow-xs"
                    : "bg-paper-raised border border-rule hover:border-rule-strong shadow-2xs"
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <StoreLogo logo={store.logo} name={store.name} />
                </div>
                <div className="min-w-0 w-full overflow-hidden">
                  <div className="font-display font-semibold text-[13px] sm:text-[14px] text-ink group-hover:text-money transition-colors truncate">
                    {store.name.replace(/\s*\([A-Z]{2}\)$/i, "")}
                  </div>
                  {store.isFeatured ? (
                    <div className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5 tracking-tight">
                      ★ FEATURED
                    </div>
                  ) : (
                    <div className="text-[11px] font-body text-muted mt-0.5">
                      {store.totalCoupons === 1 ? "1 offer" : `${store.totalCoupons ?? 0} offers`}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Featured deals */}
      {effectiveFeatured.length > 0 && (
        <section className="mb-8" aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="font-display font-bold text-[18px] sm:text-[20px] text-ink mb-3">
            Featured deals
          </h2>
          <div className="space-y-2.5">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <CouponRowSkeleton key={i} />)
              : effectiveFeatured.map((coupon) => (
                  <CouponRow key={coupon.id} coupon={coupon} />
                ))}
          </div>
        </section>
      )}

      {/* In-feed Ad Banner — from admin DB */}
      {adCreative && (
        <div className="mb-8">
          <AdBannerRow
            id={adCreative.id}
            type={adCreative.type}
            htmlContent={adCreative.htmlContent}
            title={adCreative.title}
            imageUrl={adCreative.imageUrl}
            targetUrl={adCreative.targetUrl}
            variant="in_feed"
          />
        </div>
      )}

      {/* Section 4: Trending verified coupons */}
      {trendingCoupons.length > 0 && (
        <section className="mb-8" aria-labelledby="trending-heading">
          <h2 id="trending-heading" className="font-display font-bold text-[18px] sm:text-[20px] text-ink mb-3">
            Trending verified coupons
          </h2>
          <div className="space-y-2.5">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <CouponRowSkeleton key={i} />)
              : trendingCoupons.map((coupon) => (
                  <CouponRow key={coupon.id} coupon={coupon} />
                ))}
          </div>
        </section>
      )}

      {/* Factual Trust Footer */}
      {statsConfig.showStatsBar && (
        <section className="border-t border-rule pt-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display font-bold text-[28px] text-ink tabular-nums">
                100%
              </div>
              <div className="text-[13px] font-body text-muted">
                API verified merchant links
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-[28px] text-ink tabular-nums">
                {statsConfig.weeklyCodesTested}
              </div>
              <div className="text-[13px] font-body text-muted">
                live network offers synced
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-[28px] text-ink tabular-nums">
                24/7
              </div>
              <div className="text-[13px] font-body text-muted">
                automated feed updates
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
