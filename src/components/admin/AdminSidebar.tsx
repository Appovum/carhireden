// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Persistent Sidebar Navigation
// Shared token design system, compact 224px width, sentence case, SVG icons.
// Explicit Sign out button & dedicated collapse toggle bar.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/hooks";

// Crisp SVG Line Icon Definitions
function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconCoupons() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconStores() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCategories() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconEarnings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconNetworks() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconImport() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconWithdrawals() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconClaims() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconAds() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

function IconFeatured() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTranslation() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8l6 6" />
      <path d="M4 14e1 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10z" />
      <path d="M2 5h12" />
      <path d="M7 2v3" />
    </svg>
  );
}

function IconPages() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: <IconDashboard /> }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Coupons", href: "/admin/coupons", icon: <IconCoupons /> },
      { label: "Stores", href: "/admin/stores", icon: <IconStores /> },
      { label: "Categories", href: "/admin/categories", icon: <IconCategories /> },
      { label: "Pages & content", href: "/admin/pages", icon: <IconPages /> },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Earnings analytics", href: "/admin/earnings", icon: <IconEarnings /> },
      { label: "Networks", href: "/admin/networks", icon: <IconNetworks /> },
      { label: "Import sources", href: "/admin/import-sources", icon: <IconImport /> },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Users & ledger", href: "/admin/users", icon: <IconUsers /> },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: <IconWithdrawals /> },
      { label: "Claims", href: "/admin/claims", icon: <IconClaims /> },
      { label: "Referrals", href: "/admin/referrals", icon: <IconUsers /> },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Ads", href: "/admin/ads", icon: <IconAds /> },
      { label: "Featured placements", href: "/admin/featured", icon: <IconFeatured /> },
      { label: "Deal alerts", href: "/admin/alerts", icon: <IconClaims /> },
      { label: "Ad transactions", href: "/admin/ads/revenue", icon: <IconEarnings /> },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: <IconSettings /> },
      { label: "Audit log", href: "/admin/audit-log", icon: <IconAudit /> },
      { label: "Translations", href: "/admin/i18n", icon: <IconTranslation /> },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { site_name } = useSiteSettings();

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-paper-raised border-r border-rule flex flex-col transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Brand Logo Header */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-rule flex-shrink-0">
        <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
          <svg
            width="20"
            height="20"
            viewBox="0 0 28 28"
            fill="none"
            className="text-ink flex-shrink-0"
            aria-hidden="true"
          >
            <rect x="2" y="6" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6V8M10 12V16M10 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.5 3.5" />
            <circle cx="19" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-display font-bold text-[14px] text-ink truncate">{site_name}</span>
              <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-paper-sunken border border-rule text-muted uppercase">
                Admin
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links in Strict Sentence Case */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-3 font-body">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2 py-0.5 text-[9px] font-mono font-medium text-muted uppercase tracking-wider">
                {group.title}
              </div>
            )}

            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" &&
                  item.href !== "/admin/ads" &&
                  pathname?.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2 px-2 py-1 rounded-[3px] text-[12px] transition-colors ${
                    isActive
                      ? "bg-ink text-paper font-medium"
                      : "text-muted hover:text-ink hover:bg-paper-sunken"
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer with Explicit View Site, Sign Out, & Dedicated Collapse Bar */}
      <div className="border-t border-rule flex-shrink-0 bg-paper-raised">
        {!collapsed && (
          <div className="p-2 border-b border-rule flex items-center justify-between text-[10px] font-mono">
            <span className="text-muted">Environment</span>
            <span
              className={`px-1.5 py-0.5 border rounded font-medium ${
                process.env.NEXT_PUBLIC_DEMO_MODE === "true"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : process.env.NODE_ENV === "development"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                  : "bg-paper-sunken border-rule text-ink"
              }`}
            >
              {process.env.NEXT_PUBLIC_DEMO_MODE === "true"
                ? "DEMO_MODE"
                : process.env.NODE_ENV === "development"
                ? "DEVELOPMENT"
                : "PRODUCTION"}
            </span>
          </div>
        )}

        <div className="p-2 flex items-center justify-between gap-1 text-[11px] font-body">
          <Link
            href="/"
            className="flex items-center gap-1 text-muted hover:text-ink transition-colors"
          >
            <span>View site</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>

          {!collapsed && (
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-muted hover:text-urgent transition-colors"
            >
              Sign out
            </button>
          )}
        </div>

        {/* Distinct Dedicated Collapse Toggle Bar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-1.5 px-2 bg-paper-sunken border-t border-rule text-muted hover:text-ink text-[11px] flex items-center justify-center gap-1 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
          <span>{collapsed ? "→" : "←"}</span>
        </button>
      </div>
    </aside>
  );
}
