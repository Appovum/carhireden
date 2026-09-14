// ═══════════════════════════════════════════════════════════════════
// StoreHeader — Logo, name, cashback, success rate, tabs
// ═══════════════════════════════════════════════════════════════════

"use client";

import { Store, CouponStatus } from "@/types";
import { StoreLogo } from "@/components/CouponRow";

interface StoreHeaderProps {
  store: Store;
  activeTab: CouponStatus | "all";
  onTabChange: (tab: CouponStatus | "all") => void;
  couponCounts: Record<string, number>;
}

export function StoreHeader({
  store,
  activeTab,
  onTabChange,
  couponCounts,
}: StoreHeaderProps) {
  const tabs: { key: CouponStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "expiring", label: "Expiring" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <header className="bg-paper-raised border-b border-rule w-full overflow-hidden">
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-6 box-border overflow-hidden">
        {/* Store info */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden flex-shrink-0">
            <StoreLogo logo={store.logo} name={store.name} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-[20px] sm:text-[26px] text-ink leading-tight truncate">
                {store.name} coupons & deals
              </h1>
              {store.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  ★ Featured Store
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[13px] sm:text-[14px]">
              {store.cashbackRate && (
                <span className="font-body font-medium text-money">
                  {store.cashbackRate}
                </span>
              )}

              <span className="text-rule hidden sm:inline" aria-hidden="true">
                ·
              </span>

              <span className="text-muted font-body">
                <span className="font-code tabular-nums font-medium">
                  {store.successRate}%
                </span>{" "}
                success
              </span>

              <span className="text-rule hidden sm:inline" aria-hidden="true">
                ·
              </span>

              <span className="text-muted font-body">
                <span className="font-code tabular-nums font-medium">
                  {store.totalCoupons}
                </span>{" "}
                offers
              </span>
            </div>
          </div>
        </div>

        {/* Tabs — horizontally scrollable without forcing page width */}
        <nav
          className="flex gap-1 mt-4 sm:mt-5 -mb-[1px] overflow-x-auto scrollbar-hide w-full max-w-full"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = couponCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={`px-3 sm:px-4 py-2 text-[13px] font-body font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  isActive
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink hover:border-rule"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[11px] tabular-nums font-code text-muted">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function StoreLogoLarge({ name }: { name: string }) {
  const hue =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className="w-full h-full flex items-center justify-center font-display font-bold text-[20px] sm:text-[24px] text-white rounded-[3px]"
      style={{ background: `hsl(${hue}, 45%, 50%)` }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
