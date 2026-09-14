// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Automatic Referral Link Tracker
// Captures ?ref=... or ?referral=... URL params and stores cp_ref_code cookie & localStorage.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refParam =
      searchParams.get("ref") ||
      searchParams.get("referral") ||
      searchParams.get("referrer") ||
      searchParams.get("referredByCode");

    if (refParam) {
      const cleanRef = refParam.trim();
      // Store in cookie for 30 days
      document.cookie = `cp_ref_code=${cleanRef}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      // Store in localStorage as fallback
      try {
        localStorage.setItem("cp_ref_code", cleanRef);
      } catch (e) {
        // Local storage disabled
      }
    }
  }, [searchParams]);

  return null;
}
