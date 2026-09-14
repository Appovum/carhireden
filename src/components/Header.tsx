// ═══════════════════════════════════════════════════════════════════
// Header — Logo, search, categories, auth session state, balance chip
// Sticky, minimal height. Mobile: hamburger → slide-in nav.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SearchOverlay } from "./SearchOverlay";
import { useDarkMode, useSiteSettings } from "@/hooks";
import { useTranslation } from "@/context/LanguageContext";
import { formatMoney } from "@/lib/money";
import { LanguageSelector } from "./LanguageSelector";

interface HeaderProps {
  balance?: number;
}

export function Header({ balance: propBalance }: HeaderProps) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { site_name, default_currency, currency_exchange_rate } = useSiteSettings();

  const [session, setSession] = useState<{
    loggedIn: boolean;
    user?: { id: string; name?: string; email: string; role: string };
    balance?: number;
  }>({ loggedIn: false });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.loggedIn) {
          setSession(data);
        }
      })
      .catch(() => {});

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ loggedIn: false });
    window.location.href = "/";
  };

  const displayBalance = propBalance !== undefined ? propBalance : session.balance || 0;
  const isPositiveBalance = displayBalance > 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-rule">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                className="text-ink"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="6"
                  width="24"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 6V8M10 12V16M10 20V22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="0.5 3.5"
                />
                <circle
                  cx="19"
                  cy="14"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M17.5 15.5L20.5 12.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-display font-bold text-[18px] text-ink tracking-tight">
                {site_name}
              </span>
            </Link>

            {/* Desktop: Search bar trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 max-w-sm flex-1 mx-4 bg-paper-sunken border border-rule rounded-[3px] text-[13px] font-body text-muted hover:border-rule-strong transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              aria-label="Open search"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                className="flex-shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M11 11L14 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>{t("header.search_placeholder", "Search stores and offers...")}</span>
              <kbd className="ml-auto text-[10px] font-code text-muted/60 border border-rule rounded px-1 py-0.5">
                /
              </kbd>
            </button>

            {/* Right side controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Mobile search button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 text-ink hover:text-ink/70 transition-colors rounded-sm"
                aria-label="Search"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Language Selector */}
              <LanguageSelector className="hidden sm:inline-flex" />

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="p-1.5 text-muted hover:text-ink transition-colors rounded-sm"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M9 1V3M9 15V17M1 9H3M15 9H17M3.34 3.34L4.76 4.76M13.24 13.24L14.66 14.66M14.66 3.34L13.24 4.76M4.76 13.24L3.34 14.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15.5 10.5C14.7 13.1 12.3 15 9.5 15C6 15 3 12 3 8.5C3 5.7 4.9 3.3 7.5 2.5C6.5 4 6.5 6 7.5 8C8.5 10 10.5 11 12.5 11C13.5 11 14.6 10.8 15.5 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Wallet Chip: Green ONLY when balance > 0, muted when zero */}
              <Link
                href="/wallet"
                title="Withdrawable confirmed cashback"
                className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-[3px] text-[13px] font-code font-medium tabular-nums transition-colors ${
                  isPositiveBalance
                    ? "bg-money/10 border-money/20 text-money hover:bg-money/15"
                    : "bg-paper-sunken border-rule text-muted hover:text-ink"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M3 3V2.5C3 1.67 3.67 1 4.5 1H9.5C10.33 1 11 1.67 11 2.5V3" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="10" cy="7.5" r="1" fill="currentColor" />
                </svg>
                <span className="hidden lg:inline font-body text-[11px] font-semibold opacity-80 uppercase tracking-wide mr-0.5">Ready:</span>
                {formatMoney({ amountMinor: Math.round(displayBalance * 100), currency: default_currency }, "en-US", 2, currency_exchange_rate)}
              </Link>

              {/* Dynamic Header Auth Controls */}
              {session.loggedIn && session.user ? (
                <div className="hidden sm:flex items-center gap-2 border-l border-rule pl-2.5 ml-1 text-[13px] font-body">
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-sunken border border-rule rounded-[3px] text-ink hover:border-rule-strong transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center">
                      {(session.user.name || session.user.email).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-medium max-w-[100px] truncate">
                      {session.user.name || session.user.email.split("@")[0]}
                    </span>
                  </Link>

                  {session.user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="px-2 py-0.5 bg-paper-sunken border border-rule text-muted hover:text-ink rounded text-[11px] font-mono transition-colors"
                    >
                      Admin
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="px-2 py-1 text-muted hover:text-ink transition-colors text-[13px]"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 border-l border-rule pl-2.5 ml-1 text-[13px] font-body font-medium">
                  <Link href="/login" className="px-2.5 py-1 text-ink/80 hover:text-ink transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="px-3 py-1 bg-ink text-paper rounded-[3px] hover:bg-ink/90 transition-colors font-medium">
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile nav toggle */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="sm:hidden p-2 text-ink hover:text-ink/70 transition-colors rounded-sm"
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              >
                {mobileNavOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Dedicated Category Navigation Bar — Scalable Top 5 + All Categories Dropdown + Right Actions */}
          <nav className="hidden sm:flex items-center justify-between border-t border-rule/50 text-[13px] font-body text-muted py-1.5 gap-4">
            {/* Left: Top 5 Categories (scrollable if needed) + All Categories Dropdown (unclipped) */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0">
                {categories.slice(0, 5).map((cat: any) => {
                  const name = typeof cat === "string" ? cat : cat.name;
                  const slug = typeof cat === "string" ? cat.toLowerCase() : cat.slug;
                  return (
                    <Link
                      key={slug}
                      href={`/category/${slug}`}
                      className="px-2 py-0.5 text-muted hover:text-ink transition-colors whitespace-nowrap text-[13px]"
                    >
                      {name}
                    </Link>
                  );
                })}
              </div>

              {categories.length > 5 && (
                <div className="relative inline-block shrink-0">
                  <button
                    type="button"
                    onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                    className="flex items-center gap-1 px-2 py-0.5 text-muted hover:text-ink transition-colors whitespace-nowrap text-[13px] font-medium"
                    aria-expanded={categoriesDropdownOpen}
                  >
                    <span>All Categories</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`transition-transform ${categoriesDropdownOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {categoriesDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-paper-raised border border-rule shadow-lg rounded-[4px] p-2 z-50 grid grid-cols-1 gap-0.5">
                      {categories.slice(5).map((cat: any) => {
                        const name = typeof cat === "string" ? cat : cat.name;
                        const slug = typeof cat === "string" ? cat.toLowerCase() : cat.slug;
                        return (
                          <Link
                            key={slug}
                            href={`/category/${slug}`}
                            onClick={() => setCategoriesDropdownOpen(false)}
                            className="px-2.5 py-1.5 text-[13px] text-muted hover:text-ink hover:bg-paper-sunken rounded-[2px] transition-colors whitespace-nowrap"
                          >
                            {name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Group: Stores A–Z, Submit Offer, Advertise — Fixed flex layout prevents text overlap */}
            <div className="flex items-center gap-4 text-[13px] shrink-0 border-l border-rule pl-4">
              <Link href="/stores" className="text-ink font-semibold hover:text-ink/80 transition-colors whitespace-nowrap">
                Stores A–Z
              </Link>
              <Link href="/submit" className="text-muted hover:text-ink transition-colors whitespace-nowrap text-[12px]">
                Submit Offer
              </Link>
              <Link href="/promote" className="text-ink font-medium hover:text-ink/80 transition-colors whitespace-nowrap text-[12px]">
                Promote
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile nav slide-in */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="absolute right-0 top-14 bottom-0 w-64 bg-paper-raised border-l border-rule p-4 space-y-5 overflow-y-auto font-body">
            <div className="flex flex-col gap-2 border-b border-rule pb-4">
              {session.loggedIn && session.user ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-paper-sunken border border-rule rounded-[3px] text-[13px] text-ink font-medium truncate flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted flex-shrink-0">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="truncate">{session.user.name || session.user.email}</span>
                  </div>
                  {session.user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileNavOpen(false)}
                      className="block px-3 py-2 text-[13px] text-muted hover:text-ink border border-rule rounded bg-paper-sunken font-mono"
                    >
                      Admin Console
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center py-2 text-[14px] text-ink bg-paper-sunken border border-rule rounded-[3px]"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-2 text-[14px] text-ink bg-paper-sunken border border-rule rounded-[3px]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-2 text-[14px] text-paper bg-ink rounded-[3px] font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
                Account & Tools
              </div>
              <div className="space-y-1">
                <Link href="/account" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]">
                  Account Settings
                </Link>
                <Link href="/wallet" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]">
                  Cashback Wallet
                </Link>
                <Link href="/stores" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]">
                  Stores A–Z Directory
                </Link>
                <Link href="/submit" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]">
                  Submit an Offer
                </Link>
                <Link href="/promote" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]">
                  Promote
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
                Categories
              </div>
              {categories.map((cat: any) => {
                const name = typeof cat === "string" ? cat : cat.name;
                const slug = typeof cat === "string" ? cat.toLowerCase() : cat.slug;
                return (
                  <Link
                    key={slug}
                    href={`/category/${slug}`}
                    onClick={() => setMobileNavOpen(false)}
                    className="block px-3 py-2 text-[14px] text-ink hover:bg-paper-sunken rounded-[2px]"
                  >
                    {name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
