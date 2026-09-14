// ═══════════════════════════════════════════════════════════════════
// Home Page Loading Skeleton — Zero layout shift
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { CouponRowSkeleton } from "@/components/CouponRowSkeleton";

export default function Loading() {
  return (
    <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-8 overflow-x-hidden box-border animate-pulse">
      {/* Hero skeleton */}
      <section className="mb-8">
        <div className="h-9 sm:h-11 bg-paper-sunken rounded w-3/4 max-w-md mb-2" />
        <div className="h-5 bg-paper-sunken rounded w-1/2 max-w-sm" />
      </section>

      {/* Coupon skeletons */}
      <section className="mb-8 space-y-2.5">
        <div className="h-6 bg-paper-sunken rounded w-36 mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <CouponRowSkeleton key={i} />
        ))}
      </section>
    </main>
  );
}
