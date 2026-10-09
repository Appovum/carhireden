// ═══════════════════════════════════════════════════════════════════
// Store Page Skeleton — Zero layout shift
// Shown while a store page loads its coupons and ads. Used as a Suspense
// fallback inside the page (not as a loading.tsx): a loading.tsx wraps the
// whole page, including the notFound() check, so a missing store would
// return HTTP 200 instead of a real 404.
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { CouponRowSkeleton } from "@/components/CouponRowSkeleton";

export function StorePageSkeleton() {
  return (
    <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex-1 overflow-x-hidden box-border animate-pulse">
      <div className="h-20 bg-paper-sunken rounded mb-6" />
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CouponRowSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
