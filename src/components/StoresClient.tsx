// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Interactive Stores Directory Client Component
// In-place search, A-Z / Most Offers sort toggle, muted empty letters,
// 2-line title clamp with tooltips, and light paper design palette.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { StoreLogo } from "@/components/CouponRow";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  domain: string;
  logoUrl?: string | null;
  totalCoupons: number;
  defaultCashbackRate?: string | null;
}

interface StoresClientProps {
  activeStores: StoreItem[];
  comingSoonStores: StoreItem[];
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function StoresClient({ activeStores, comingSoonStores }: StoresClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "offers">("name");
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Filter stores by search query
  const filteredActive = useMemo(() => {
    let result = activeStores;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
      );
    }
    if (sortBy === "offers") {
      return [...result].sort((a, b) => b.totalCoupons - a.totalCoupons);
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStores, searchQuery, sortBy]);

  // Group stores by alphabet letter
  const groupedActive = useMemo(() => {
    const map: Record<string, StoreItem[]> = {};
    for (const letter of ALPHABET) {
      map[letter] = [];
    }
    map["#"] = [];

    for (const store of filteredActive) {
      const cleanName = store.name.replace(/^the\s+/i, "");
      const firstChar = cleanName.charAt(0).toUpperCase();
      if (ALPHABET.includes(firstChar)) {
        map[firstChar].push(store);
      } else {
        map["#"].push(store);
      }
    }
    return map;
  }, [filteredActive]);

  const formatOfferCount = (count: number) => {
    return count === 1 ? "1 offer" : `${count} offers`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-display font-bold text-[28px] sm:text-[36px] text-ink tracking-tight">
            Stores
          </h1>
          <p className="text-[14px] sm:text-[15px] font-body text-muted mt-1 max-w-xl">
            Browse our complete directory of verified promo codes and merchant cashback offers.
          </p>
        </div>

        {/* Live Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* In-Place Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-initial">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores..."
              className="w-full pl-8 pr-3 py-1.5 bg-paper-sunken border border-rule rounded-[4px] text-[13px] font-body text-ink placeholder:text-muted focus:outline-none focus:border-rule-strong transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-body text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center bg-paper-sunken border border-rule rounded-[4px] p-0.5 text-[12px] font-body">
            <button
              onClick={() => setSortBy("name")}
              className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                sortBy === "name"
                  ? "bg-paper-raised text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              A–Z
            </button>
            <button
              onClick={() => setSortBy("offers")}
              className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                sortBy === "offers"
                  ? "bg-paper-raised text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Most offers
            </button>
          </div>
        </div>
      </div>

      {/* Alphabet Quick-Jump Nav (Muted & Disabled for Empty Letters) */}
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-paper-raised border border-rule rounded-[4px] shadow-2xs">
        {["#", ...ALPHABET].map((letter) => {
          const count = (groupedActive[letter] || []).length;
          const hasStores = count > 0;

          if (!hasStores && sortBy === "name") {
            return (
              <span
                key={letter}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[3px] text-[12px] font-code font-bold text-muted/30 bg-paper-sunken/40 cursor-not-allowed select-none"
                title={`No stores starting with ${letter}`}
              >
                {letter}
              </span>
            );
          }

          return (
            <a
              key={letter}
              href={`#section-${letter}`}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[3px] text-[12px] font-code font-bold bg-paper-sunken border border-rule text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              {letter}
            </a>
          );
        })}
      </div>

      {/* Grouped Store Grids */}
      {filteredActive.length === 0 ? (
        <div className="p-10 text-center bg-paper-raised border border-rule rounded-[4px] text-muted space-y-2">
          <p className="font-display font-semibold text-[16px] text-ink">No stores match &quot;{searchQuery}&quot;</p>
          <p className="text-[13px] font-body">Try clearing your search term to see all verified stores.</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 px-3.5 py-1.5 bg-ink text-paper text-[13px] font-bold rounded-[4px]"
          >
            Reset search
          </button>
        </div>
      ) : sortBy === "offers" ? (
        /* Flat Grid sorted by offer count */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredActive.map((store) => (
            <StoreDirectoryCard key={store.id} store={store} formatOfferCount={formatOfferCount} />
          ))}
        </div>
      ) : (
        /* Alphabetical Grouped Sections */
        <div className="space-y-8">
          {["#", ...ALPHABET].map((letter) => {
            const list = groupedActive[letter] || [];
            if (list.length === 0) return null;

            return (
              <section key={letter} id={`section-${letter}`} className="space-y-3 scroll-mt-20">
                <div className="flex items-center gap-2 border-b border-rule pb-1.5">
                  <h2 className="font-display font-bold text-[20px] text-ink">
                    {letter}
                  </h2>
                  <span className="text-[12px] font-code text-muted">({list.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {list.map((store) => (
                    <StoreDirectoryCard key={store.id} store={store} formatOfferCount={formatOfferCount} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Collapsed Coming Soon Section for 0-Offer Stores */}
      {comingSoonStores.length > 0 && (
        <div className="border-t border-rule pt-6 mt-8">
          <button
            onClick={() => setShowComingSoon(!showComingSoon)}
            className="flex items-center gap-2 text-[14px] font-display font-bold text-muted hover:text-ink transition-colors"
          >
            <span>{showComingSoon ? "▼" : "▶"}</span>
            <span>Coming soon ({comingSoonStores.length} stores with 0 current offers)</span>
          </button>

          {showComingSoon && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4 opacity-75">
              {comingSoonStores.map((store) => (
                <StoreDirectoryCard key={store.id} store={store} formatOfferCount={formatOfferCount} isComingSoon />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoreDirectoryCard({
  store,
  formatOfferCount,
  isComingSoon = false,
}: {
  store: StoreItem;
  formatOfferCount: (c: number) => string;
  isComingSoon?: boolean;
}) {
  const cleanName = store.name.replace(/\s*\([A-Z]{2}\)$/i, "");

  return (
    <Link
      href={`/store/${store.slug}`}
      title={store.name}
      className="p-3 sm:p-3.5 bg-paper-raised border border-rule rounded-[4px] hover:border-rule-strong transition-all flex flex-col justify-between group shadow-2xs h-full"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* High quality StoreLogo with WebP / Favicon priority */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <StoreLogo logo={store.logoUrl || undefined} name={store.name} />
        </div>

        {/* 2-line title clamp with full name title attribute */}
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-[13px] sm:text-[14px] text-ink group-hover:text-money transition-colors line-clamp-2 leading-tight">
            {cleanName}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-body text-muted mt-2.5 pt-2 border-t border-rule/50">
        <span>{formatOfferCount(store.totalCoupons)}</span>

        {/* Green ONLY on real unique cashback rates */}
        {store.defaultCashbackRate &&
          store.defaultCashbackRate !== "0%" &&
          store.defaultCashbackRate !== "Up to 5%" && (
            <span className="text-money font-code font-semibold">
              {store.defaultCashbackRate}
            </span>
          )}
      </div>
    </Link>
  );
}
