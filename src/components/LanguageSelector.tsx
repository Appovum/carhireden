// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Global Language / Locale Selector Dropdown
// Saves preferred locale in cookie & localStorage, triggers re-renders.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";

export interface LanguageOption {
  code: string;
  name: string;
  shortName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English (US)", shortName: "EN" },
  { code: "es", name: "Español (ES)", shortName: "ES" },
  { code: "fr", name: "Français (FR)", shortName: "FR" },
  { code: "de", name: "Deutsch (DE)", shortName: "DE" },
  { code: "hi", name: "हिन्दी (HI)", shortName: "HI" },
];

export function LanguageSelector({ className = "" }: { className?: string }) {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_locale") || "en";
      setCurrentLang(saved);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_locale", newLang);
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
      window.dispatchEvent(new Event("locale_changed"));
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 text-[12px] font-body text-muted ${className}`}>
      <select
        value={currentLang}
        onChange={handleChange}
        aria-label="Select Language"
        className="bg-paper-sunken border border-rule/80 rounded px-2 py-1 text-[12px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
