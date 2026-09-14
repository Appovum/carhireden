// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Site-Wide Affiliate Disclosure Banner
// Dynamic disclosure banner component reading admin settings.
// ═══════════════════════════════════════════════════════════════════

import React from "react";

interface AffiliateDisclosureProps {
  customText?: string;
  compact?: boolean;
}

export function AffiliateDisclosure({
  customText = "Disclosure: CouponPilot is supported by our users. When you click links on our site and make a purchase, we may earn an affiliate commission at no extra cost to you.",
  compact = false,
}: AffiliateDisclosureProps) {
  return (
    <div
      role="region"
      aria-label="Affiliate Disclosure"
      className={`bg-slate-900/80 border-t border-slate-800 text-slate-400 text-xs py-3 px-4 text-center leading-relaxed ${
        compact ? "text-[11px] py-2" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4 text-emerald-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{customText}</span>
      </div>
    </div>
  );
}
