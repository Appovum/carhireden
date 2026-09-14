// ═══════════════════════════════════════════════════════════════════
// CouponPilot — 500 Error Boundary Page
// Monochromatic Black & White Brand Design System
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6 text-center font-body">
      <div className="max-w-md w-full bg-paper-raised border border-rule rounded-[4px] p-8 space-y-6 shadow-sm">
        {/* Monochromatic Ticket Warning Icon */}
        <div className="w-14 h-14 bg-paper-sunken border border-rule-strong rounded-[4px] flex items-center justify-center mx-auto text-ink">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-semibold text-[22px] text-ink">Something Went Wrong</h1>
          <p className="text-[13px] text-muted leading-relaxed">
            An unexpected application error occurred. You can retry loading the page or return to the homepage.
          </p>
        </div>

        <div className="flex items-center gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-ink text-paper font-medium text-[13px] rounded-[4px] hover:bg-ink/90 transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-paper-raised border border-rule text-ink hover:border-rule-strong font-medium text-[13px] rounded-[4px] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
