// ═══════════════════════════════════════════════════════════════════
// CouponRow — The workhorse component
//
// A voucher stub with a perforated edge. Left side: info.
// Right side (the stub): action button + code preview mask.
//
// Refinements:
// 1. Image logo support with fallback letter badge
// 2. Prevent title text from overflowing action stub
// 3. Short clean discount text rendering
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useRef } from "react";
import { Coupon } from "@/types";
import { TypeBadge } from "./TypeBadge";
import { TrustCluster } from "./TrustCluster";
import { ExpiryBadge } from "./ExpiryBadge";
import { useReducedMotion, useCopyToClipboard } from "@/hooks";

interface CouponRowProps {
  coupon: Coupon;
  hideLogo?: boolean;
}

export function CouponRow({ coupon, hideLogo = false }: CouponRowProps) {
  const [revealed, setRevealed] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const reducedMotion = useReducedMotion();
  const { copied, copy } = useCopyToClipboard();
  const stubRef = useRef<HTMLDivElement>(null);

  const isCode = coupon.type === "code";
  const isCashback = coupon.type === "cashback";
  const isExpired = coupon.status === "expired";

  const actionLabel = isCode
    ? "Get code"
    : isCashback
    ? "Activate"
    : "Get deal";

  const maskedCode = coupon.code
    ? coupon.code.length > 4
      ? `${coupon.code.slice(0, 4)}••••`
      : `${coupon.code.slice(0, 2)}••••`
    : null;

  const handleAction = async () => {
    try {
      const res = await fetch("/api/click/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: coupon.id,
          storeId: (coupon as any).storeId,
        }),
      });
      const data = await res.json();
      const clickUrl = data.clickUrl || coupon.merchantUrl;
      window.open(clickUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(coupon.merchantUrl, "_blank", "noopener,noreferrer");
    }

    if (isCode && coupon.code) {
      if (reducedMotion) {
        setRevealed(true);
      } else {
        setTearing(true);
        setTimeout(() => {
          setTearing(false);
          setRevealed(true);
        }, 400);
      }
    }
  };

  const handleCopy = () => {
    if (coupon.code) {
      copy(coupon.code);
    }
  };

  const handleVote = async (vote: "up" | "down") => {
    setVoted(vote);
    try {
      await fetch("/api/coupon/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId: coupon.id, voteType: vote }),
      });
    } catch (err) {
      console.error("Failed to persist vote:", err);
    }
  };

  return (
    <article
      className={`voucher-row w-full max-w-full min-w-0 box-border rounded-[4px] overflow-hidden transition-all ${
        isExpired ? "opacity-60" : ""
      }`}
      aria-label={`${coupon.storeName}: ${coupon.discountText} — ${coupon.title}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch w-full min-w-0">
        {/* ─── Left: Coupon info (Top-aligned, whitespace falls at bottom) ── */}
        <div className="flex-1 flex gap-2.5 sm:gap-3 p-3.5 sm:p-4 min-w-0 items-start overflow-hidden">
          {/* Store logo */}
          {!hideLogo && (
            <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden">
              <StoreLogo logo={coupon.storeLogo} name={coupon.storeName} />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-start items-start gap-2 overflow-hidden">
            {/* Row 1: Discount figure + Title (Line-clamp-2) */}
            <div className="flex items-baseline gap-2.5 min-w-0 w-full overflow-hidden">
              <span
                className="font-display font-bold text-[18px] sm:text-[22px] leading-none tracking-tight text-ink flex-shrink-0"
                aria-label={`Discount: ${coupon.discountText}`}
              >
                {coupon.discountText}
              </span>
              <span className="font-body text-[13px] sm:text-[14px] text-ink/90 line-clamp-2 leading-snug min-w-0 break-words pr-2">
                {coupon.title}
              </span>
            </div>

            {/* Row 2: Trust cluster */}
            <div className="min-w-0 w-full">
              <TrustCluster
                successRate={coupon.successRate}
                verifiedAt={coupon.verifiedAt}
                usedToday={coupon.usedToday}
              />
            </div>

            {/* Row 3: Badge + Expiry */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5 min-w-0 w-full">
              <TypeBadge type={coupon.type} />
              <ExpiryBadge expiresAt={coupon.expiresAt} />
              {coupon.isExclusive && (
                <span className="text-[11px] font-body font-medium text-money tracking-wide">
                  Exclusive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right / Bottom: Action stub (Expands on reveal) ────────── */}
        <div
          ref={stubRef}
          className={`relative flex-shrink-0 ${
            revealed ? "sm:w-[210px]" : "sm:w-[165px]"
          } w-full border-t sm:border-t-0 sm:border-l border-dashed border-rule bg-paper-raised sm:bg-paper-sunken/20 transition-all duration-200 ${
            revealed ? "bg-paper-sunken" : ""
          }`}
        >
          {/* Punch hole notches on desktop */}
          {!revealed && (
            <>
              <div
                className="hidden sm:block absolute -left-[5px] -top-[5px] w-[9px] h-[9px] rounded-full bg-paper border border-rule"
                aria-hidden="true"
              />
              <div
                className="hidden sm:block absolute -left-[5px] -bottom-[5px] w-[9px] h-[9px] rounded-full bg-paper border border-rule"
                aria-hidden="true"
              />
            </>
          )}

          {!revealed ? (
            /* ── Collapsed Stub: High Contrast Button ─────────────────── */
            <div
              className={`flex flex-col items-center justify-center h-full p-2.5 sm:p-3.5 gap-1.5 transition-transform w-full box-border ${
                tearing ? "animate-[tear-stub_400ms_ease-out_forwards]" : ""
              }`}
            >
              {/* Desktop Code Preview Hint */}
              {isCode && maskedCode ? (
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-code font-medium text-muted tracking-widest bg-paper border border-dashed border-rule rounded px-2 py-0.5 select-none">
                  <span className="text-[10px] text-muted/60">CODE</span>
                  <span className="text-ink/80">{maskedCode}</span>
                </div>
              ) : isCashback && coupon.cashbackRate ? (
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-code font-medium text-money tracking-tight bg-money/5 border border-money/20 rounded px-2 py-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-money">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>{coupon.cashbackRate}</span>
                </div>
              ) : null}

              {/* Action Button: Non-wrapping short label, high contrast */}
              <button
                onClick={handleAction}
                disabled={isExpired}
                className={`w-full h-9 px-3 text-[13px] sm:text-[14px] font-body font-semibold rounded-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring flex items-center justify-center gap-1.5 text-center shadow-xs ${
                  isExpired
                    ? "bg-rule text-muted cursor-not-allowed"
                    : isCashback
                    ? "bg-money text-white hover:bg-money/90 active:bg-money/80"
                    : "bg-[#1A1A1F] text-white hover:bg-[#2A2A30] dark:bg-[#E8E6E1] dark:text-[#141418] dark:hover:bg-white"
                }`}
              >
                <span className="whitespace-nowrap">{isExpired ? "Expired" : actionLabel}</span>
                {!isExpired && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="flex-shrink-0 opacity-90"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.25 3.5L8.75 7L5.25 10.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <span className="text-[10px] font-body text-muted/80 text-center tracking-tight">
                {isCode ? "Reveals code & opens site" : "Opens merchant site"}
              </span>
            </div>
          ) : (
            /* ── Revealed Stub: Code Box + Copy + Feedback + Ad Slot ─── */
            <div className="flex flex-col items-center justify-center h-full p-2.5 sm:p-3.5 gap-2 animate-[fade-in_200ms_ease-out] w-full box-border">
              {/* Copy Code Box */}
              <div className="w-full flex items-center gap-1.5 p-1.5 bg-paper border border-rule rounded">
                <code className="flex-1 font-code font-bold text-[13px] text-ink tracking-wider text-center select-all truncate">
                  {coupon.code}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-2 py-1 text-[11px] font-body font-medium bg-ink text-paper rounded hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 flex-shrink-0"
                  aria-label={copied ? "Code copied" : "Copy coupon code"}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Feedback Prompt */}
              {voted === null ? (
                <div className="flex items-center justify-between w-full text-[11px] text-muted font-body">
                  <span>Worked?</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleVote("up")}
                      className="px-2 py-0.5 text-[11px] font-body border border-rule rounded text-muted hover:border-money hover:text-money transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring flex items-center gap-1"
                      aria-label="Yes, it worked"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M4 11V6H1.5C1.22 6 1 5.78 1 5.5V1.5C1 1.22 1.22 1 1.5 1H4M4 11H9.5C10.05 11 10.5 10.55 10.5 10L11 6.5C11.05 6.22 10.9 5.95 10.65 5.8C10.45 5.65 10.2 5.6 9.95 5.65L7 6.25V2.5C7 1.67 6.33 1 5.5 1L4 4V11Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Yes
                    </button>
                    <button
                      onClick={() => handleVote("down")}
                      className="px-2.5 py-1 text-[11px] font-body border border-rule rounded text-muted hover:border-urgent hover:text-urgent transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring flex items-center gap-1"
                      aria-label="No, it did not work"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M8 1V6H10.5C10.78 6 11 6.22 11 6.5V10.5C11 10.78 10.78 11 10.5 11H8M8 1H2.5C1.95 1 1.5 1.45 1.5 2L1 5.5C0.95 5.78 1.1 6.05 1.35 6.2C1.55 6.35 1.8 6.4 2.05 6.35L5 5.75V9.5C5 10.33 5.67 11 6.5 11L8 8V1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted font-body text-center mt-0.5">
                  {voted === "up" ? "Thanks for feedback!" : "We'll recheck this code."}
                </p>
              )}

              {/* Post-Reveal Sponsored Offer Slot */}
              <div className="w-full mt-1 pt-1.5 border-t border-rule/60 text-center">
                <span className="text-[9px] font-code text-muted font-semibold uppercase tracking-wider block">
                  SPONSORED LINK
                </span>
                <a
                  href="/wallet"
                  className="text-[10px] font-body text-muted hover:text-ink underline truncate block mt-0.5"
                >
                  Partner deal: Earn $10 bonus credit
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function StoreLogo({ logo, name, domain }: { logo?: string | null; name: string; domain?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const cleanDomain = domain || (() => {
    try {
      const match = name.match(/([a-z0-9-]+\.[a-z]{2,})/i);
      return match ? match[1] : `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
    } catch {
      return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
    }
  })();

  const hdGoogleLogo = cleanDomain ? `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=256` : null;
  const iconHorseLogo = cleanDomain ? `https://icon.horse/icon/${cleanDomain}` : null;

  const logoSources = [
    ...(logo && logo.trim() && !logo.includes("sz=128") ? [logo] : []),
    ...(hdGoogleLogo ? [hdGoogleLogo] : []),
    ...(iconHorseLogo ? [iconHorseLogo] : []),
  ];

  const currentLogo = logoSources[fallbackIndex];

  const handleNextLogoError = () => {
    if (fallbackIndex < logoSources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setImgError(true);
    }
  };

  if (currentLogo && !imgError) {
    return (
      <div className="w-full h-full bg-white p-1 rounded border border-rule/60 shadow-2xs flex items-center justify-center overflow-hidden">
        <img
          src={currentLogo}
          alt={name}
          width={48}
          height={48}
          className="w-full h-full object-contain object-center"
          onError={handleNextLogoError}
        />
      </div>
    );
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 3) % 20);
  const lightness = 40 + (Math.abs(hash >> 5) % 15);

  return (
    <div
      className="w-full h-full flex items-center justify-center font-display font-bold text-[16px] sm:text-[18px] text-white rounded-[2px]"
      style={{
        background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
