// ═══════════════════════════════════════════════════════════════════
// SearchOverlay — Instant autocomplete grouped by Stores & Categories
// Keyboard navigable, prominent on mobile.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SearchResult } from "@/types";
import { StoreLogo } from "@/components/CouponRow";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focusIndex, setFocusIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch search autocomplete live from DB endpoint
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const stores = results.filter((r) => r.type === "store");
  const categories = results.filter((r) => r.type === "category");
  const allResults = [...stores, ...categories];

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setFocusIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
      } else if (e.key === "Enter" && focusIndex >= 0 && allResults[focusIndex]) {
        e.preventDefault();
        const item = allResults[focusIndex];
        const targetUrl = item.slug.startsWith("/") ? item.slug : `/${item.type}/${item.slug}`;
        window.location.href = targetUrl;
        onClose();
      }
    },
    [isOpen, focusIndex, allResults, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-paper-raised border border-rule rounded-[4px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule bg-paper">
          <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusIndex(-1);
            }}
            placeholder="Search stores or categories (e.g. Nike, Fashion)..."
            className="w-full bg-transparent font-body text-[15px] text-ink placeholder:text-muted border-none focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-[12px] font-body text-muted hover:text-ink px-2 py-1 rounded bg-paper-sunken border border-rule"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <div className="p-6 text-center text-[13px] font-body text-muted">
              Type to search across all store brands and categories.
            </div>
          ) : allResults.length === 0 ? (
            <div className="p-6 text-center text-[13px] font-body text-muted">
              No matching stores or categories found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-3">
              {stores.length > 0 && (
                <div>
                  <div className="text-[11px] font-body font-semibold text-muted uppercase tracking-wider px-3 py-1">
                    Stores
                  </div>
                  {stores.map((item, idx) => {
                    const isFocused = focusIndex === idx;
                    const href = `/store/${item.slug}`;
                    return (
                      <a
                        key={item.slug}
                        href={href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors ${
                          isFocused ? "bg-paper-sunken border border-rule-strong" : "hover:bg-paper-sunken"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-[3px] bg-paper-sunken border border-rule flex items-center justify-center overflow-hidden shrink-0">
                          <StoreLogo logo={item.logo} name={item.label} domain={item.domain} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-body font-medium text-ink truncate">{item.label}</div>
                          {item.subtitle && <div className="text-[12px] font-body text-muted">{item.subtitle}</div>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <div className="text-[11px] font-body font-semibold text-muted uppercase tracking-wider px-3 py-1">
                    Categories
                  </div>
                  {categories.map((item, idx) => {
                    const realIdx = stores.length + idx;
                    const isFocused = focusIndex === realIdx;
                    const href = `/category/${item.slug}`;
                    return (
                      <a
                        key={item.slug}
                        href={href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors ${
                          isFocused ? "bg-paper-sunken border border-rule-strong" : "hover:bg-paper-sunken"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-[3px] bg-paper-sunken border border-rule flex items-center justify-center text-muted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-body font-medium text-ink truncate">{item.label}</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
