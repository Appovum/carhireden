// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Sticky Page Header Component
// Standard header with title, breadcrumbs, date picker, primary action.
// SVG line icons (no emojis).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React from "react";
import Link from "next/link";
import { useDarkMode } from "@/hooks";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function AdminHeader({
  title,
  breadcrumbs,
  dateRange = "90d",
  onDateRangeChange,
  primaryAction,
}: AdminHeaderProps) {
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-30 bg-paper-raised/95 backdrop-blur border-b border-rule px-6 py-3 space-y-2">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-[12px] font-body text-muted">
        <Link href="/admin" className="hover:text-ink transition-colors">
          Admin
        </Link>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={idx}>
            <span>/</span>
            {b.href ? (
              <Link href={b.href} className="hover:text-ink transition-colors">
                {b.label}
              </Link>
            ) : (
              <span className="text-ink font-medium">{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Main Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-ink leading-tight">
          {title}
        </h1>

        <div className="flex items-center gap-3">
          {/* Global Date Range Picker */}
          {onDateRangeChange && (
            <div className="flex items-center border border-rule rounded-[3px] bg-paper-sunken p-0.5 text-[12px] font-body">
              {["today", "7d", "30d", "90d"].map((range) => (
                <button
                  key={range}
                  onClick={() => onDateRangeChange(range)}
                  className={`px-2.5 py-1 rounded-[2px] font-medium transition-colors uppercase ${
                    dateRange === range
                      ? "bg-paper-raised text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="p-2 border border-rule rounded-[3px] bg-paper-sunken text-ink hover:bg-paper-raised transition-colors text-[13px]"
            title="Toggle theme"
          >
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Primary Action Button */}
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded-[3px] hover:bg-ink/90 transition-colors whitespace-nowrap"
              >
                {primaryAction.label}
              </Link>
            ) : (
              <button
                onClick={primaryAction.onClick}
                className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded-[3px] hover:bg-ink/90 transition-colors whitespace-nowrap"
              >
                {primaryAction.label}
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
