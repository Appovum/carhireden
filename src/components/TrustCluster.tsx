// ═══════════════════════════════════════════════════════════════════
// TrustCluster — Success rate, verified time, usage count
// Shows real verified status & suppresses unvoted fabricated stats & 0x usage.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime, formatCount } from "@/utils/format";

interface TrustClusterProps {
  successRate: number;
  verifiedAt: string;
  usedToday: number;
}

export function TrustCluster({
  successRate,
  verifiedAt,
  usedToday,
}: TrustClusterProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");

  useEffect(() => {
    setRelativeTime(formatRelativeTime(verifiedAt));
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(verifiedAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [verifiedAt]);

  const hasRealActivity = usedToday > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted font-body">
      {/* Verification status / real success rate */}
      <span className="inline-flex items-center gap-1">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-money flex-shrink-0"
          aria-hidden="true"
        >
          <path
            d="M6 1L7.545 4.13L11 4.635L8.5 7.07L9.09 10.51L6 8.885L2.91 10.51L3.5 7.07L1 4.635L4.455 4.13L6 1Z"
            fill="currentColor"
          />
        </svg>
        {hasRealActivity ? (
          <>
            <span className="tabular-nums font-code font-medium">
              {Math.round(successRate)}%
            </span>
            <span className="hidden sm:inline">success</span>
          </>
        ) : (
          <span className="font-medium text-ink/80">Verified deal</span>
        )}
      </span>

      {/* Verified time */}
      {relativeTime && (
        <>
          <span className="text-rule" aria-hidden="true">
            ·
          </span>
          <span className="inline">
            Verified {relativeTime}
          </span>
        </>
      )}

      {/* Usage count — hidden if zero */}
      {usedToday > 0 && (
        <>
          <span className="text-rule hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline">
            Used{" "}
            <span className="tabular-nums font-code">
              {formatCount(usedToday)}
            </span>
            × today
          </span>
        </>
      )}
    </div>
  );
}
