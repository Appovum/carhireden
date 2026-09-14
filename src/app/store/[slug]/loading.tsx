// ═══════════════════════════════════════════════════════════════════
// Store Page Loading Skeleton — Zero layout shift
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { CouponRowSkeleton } from "@/components/CouponRowSkeleton";

export default function StoreLoading() {
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
