// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Global i18n Translation Context & Hook
// Provides t("key", "fallback") for instant site-wide localization.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type SupportedLocale = "en" | "es" | "fr" | "de" | "hi";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (lang: SupportedLocale) => void;
  t: (key: string, fallback: string) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (_key, fallback) => fallback,
  loading: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");
  const [catalog, setCatalog] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/i18n");
      const data = await res.json();
      if (data.translations && Array.isArray(data.translations)) {
        const dict: Record<string, Record<string, string>> = {};
        data.translations.forEach((item: any) => {
          if (item.key) {
            dict[item.key] = {
              en: item.en || "",
              es: item.es || "",
              fr: item.fr || "",
              de: item.de || "",
              hi: item.hi || "",
            };
          }
        });
        setCatalog(dict);
      }
    } catch (err) {
      console.error("Failed to load translation catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = (localStorage.getItem("preferred_locale") as SupportedLocale) || "en";
      setLocaleState(saved);
    }
    fetchCatalog();

    const handleLocaleChange = () => {
      if (typeof window !== "undefined") {
        const updated = (localStorage.getItem("preferred_locale") as SupportedLocale) || "en";
        setLocaleState(updated);
      }
    };

    window.addEventListener("locale_changed", handleLocaleChange);
    return () => {
      window.removeEventListener("locale_changed", handleLocaleChange);
    };
  }, []);

  const setLocale = (lang: SupportedLocale) => {
    setLocaleState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_locale", lang);
      document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
      window.dispatchEvent(new Event("locale_changed"));
    }
  };

  const t = (key: string, fallback: string): string => {
    if (locale === "en") return fallback;
    const entry = catalog[key];
    if (entry && entry[locale] && entry[locale].trim() !== "") {
      return entry[locale];
    }
    return fallback;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
