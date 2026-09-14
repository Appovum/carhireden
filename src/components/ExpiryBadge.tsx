// ═══════════════════════════════════════════════════════════════════
// ExpiryBadge — conditional --urgent styling
// Only uses --urgent when ≤ 24 hours remaining.
// Otherwise neutral --muted text.
//
// Client component: expiry countdown computed client-side to avoid
// hydration mismatch.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { formatExpiry } from "@/utils/format";

interface ExpiryBadgeProps {
  expiresAt?: string;
}

export function ExpiryBadge({ expiresAt }: ExpiryBadgeProps) {
  const [expiry, setExpiry] = useState<{ text: string; isUrgent: boolean } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    setExpiry(formatExpiry(expiresAt));
    const interval = setInterval(() => {
      setExpiry(formatExpiry(expiresAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || !expiry) return null;

  if (expiry.text === "Expired") {
    return (
      <span className="text-[12px] text-muted font-body line-through">
        {expiry.text}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-body font-medium ${
        expiry.isUrgent ? "text-urgent" : "text-muted"
      }`}
    >
      {expiry.isUrgent && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="flex-shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="6"
            cy="6"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M6 3.5V6.5L7.5 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {expiry.text}
    </span>
  );
}
