// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Branded Searchable Store Combobox
// Custom dropdown with instant live search filtering & paper theme design
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useRef, useEffect } from "react";

export interface StoreOption {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

interface StoreComboboxProps {
  stores: StoreOption[];
  value: string;
  onChange: (storeId: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function StoreCombobox({
  stores,
  value,
  onChange,
  placeholder = "Search or select a store...",
  required = false,
}: StoreComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStore = stores.find((s) => s.id === value);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus search input automatically when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (storeId: string) => {
    onChange(storeId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for native HTML form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="sr-only opacity-0 w-0 h-0 pointer-events-none absolute"
        />
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-paper-sunken border border-rule rounded-[3px] px-3.5 py-2.5 text-left text-ink text-[14px] font-body focus:outline-none focus:border-ink hover:border-rule-strong transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className={selectedStore ? "text-ink font-medium truncate" : "text-muted truncate"}>
          {selectedStore ? selectedStore.name : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Floating Searchable Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-paper-raised border border-rule shadow-xl rounded-[4px] p-2 space-y-2 max-h-72 flex flex-col font-body">
          {/* Live Search Field */}
          <div className="relative flex-shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-2.5 text-muted pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name..."
              className="w-full bg-paper-sunken border border-rule rounded-[3px] pl-9 pr-3 py-1.5 text-ink text-[13px] font-body focus:outline-none focus:border-ink placeholder:text-muted"
            />
          </div>

          {/* Filtered Store List */}
          <div className="overflow-y-auto flex-1 divide-y divide-rule/30 text-[13px] font-body pr-0.5 scrollbar-hide">
            {filteredStores.length > 0 ? (
              filteredStores.map((s) => {
                const isSelected = s.id === value;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[2px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-paper-sunken text-ink font-semibold"
                        : "text-ink hover:bg-paper-sunken/70"
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-money flex-shrink-0 ml-2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-muted text-[13px]">
                No stores matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
