// ═══════════════════════════════════════════════════════════════════
// StorePageClient — Client component for /store/[slug]
// Renders header_top banner, coupon list with in-feed ads, sidebar
// ad, and empty states. All ads are real DB-driven creatives.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useMemo, Fragment } from "react";
import { Coupon, Store, CouponStatus } from "@/types";
import { StoreHeader } from "@/components/StoreHeader";
import { CouponRow } from "@/components/CouponRow";
import { AdBannerRow } from "@/components/AdBannerRow";
import { EmptyState } from "@/components/EmptyStates";

interface StorePageClientProps {
  store: Store;
  storeCoupons: Coupon[];
  walletBalance?: number;
  adCreative?: any;
  sidebarAdCreative?: any;
  headerAdCreative?: any;
}

export function StorePageClient({
  store,
  storeCoupons,
  walletBalance = 0,
  adCreative,
  sidebarAdCreative,
  headerAdCreative,
}: StorePageClientProps) {
  const [activeTab, setActiveTab] = useState<CouponStatus | "all">("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return storeCoupons;
    return storeCoupons.filter((c) => c.status === activeTab);
  }, [storeCoupons, activeTab]);

  const couponCounts = useMemo(() => {
    return {
      all: storeCoupons.length,
      active: storeCoupons.filter((c) => c.status === "active").length,
      expiring: storeCoupons.filter((c) => c.status === "expiring").length,
      expired: storeCoupons.filter((c) => c.status === "expired").length,
    };
  }, [storeCoupons]);

  return (
    <>
      {/* Header Top Banner (728×90) — from admin DB */}
      {headerAdCreative && (
        <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 pt-4">
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

      <StoreHeader
        store={store}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        couponCounts={couponCounts}
      />

      <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex-1 overflow-x-hidden box-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Coupons List Column */}
          <div className="lg:col-span-8 min-w-0">
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filtered.map((coupon, index) => (
                  <Fragment key={coupon.id}>
                    <CouponRow coupon={coupon} hideLogo />
                    {(index + 1) % 5 === 0 && adCreative && (
                      <AdBannerRow
                        id={adCreative.id}
                        type={adCreative.type}
                        htmlContent={adCreative.htmlContent}
                        title={adCreative.title}
                        imageUrl={adCreative.imageUrl}
                        targetUrl={adCreative.targetUrl}
                        variant="in_feed"
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            ) : (
              <EmptyState
                type="no-coupons"
                storeName={store.name}
                onAction={() => setActiveTab("all")}
              />
            )}
          </div>

          {/* Right Sidebar Column — Store Sidebar (300×250) Banner */}
          {sidebarAdCreative && (
            <aside className="lg:col-span-4 flex flex-col gap-4 sticky top-4">
              <AdBannerRow
                id={sidebarAdCreative.id}
                type={sidebarAdCreative.type}
                htmlContent={sidebarAdCreative.htmlContent}
                title={sidebarAdCreative.title}
                imageUrl={sidebarAdCreative.imageUrl}
                targetUrl={sidebarAdCreative.targetUrl}
                variant="sidebar"
              />
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
