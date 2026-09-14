// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Site Settings Context & Provider
// Zero-flash SSR branding state + real-time client sync.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface SiteSettings {
  site_name: string;
  support_email: string;
  default_currency: string;
  currency_exchange_rate: number;
  min_withdrawal: string;
  cashback_split: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "CouponPilot",
  support_email: "support@couponpilot.com",
  default_currency: "USD",
  currency_exchange_rate: 1.0,
  min_withdrawal: "10.00",
  cashback_split: "50",
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<SiteSettings>;
}) {
  const [settings, setSettings] = useState<SiteSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  }));

  const refreshSettings = useCallback(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => {
            const next = { ...prev, ...data.settings };
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Sync browser tab title cleanly without double-replacement / "ss" bugs
    if (typeof document !== "undefined" && settings.site_name) {
      const parts = document.title.split(" — ");
      const tagline = parts[1] || "Working coupon codes and cashback";
      document.title = `${settings.site_name} — ${tagline}`;
    }
  }, [settings.site_name]);

  useEffect(() => {
    refreshSettings();
    window.addEventListener("site_settings_updated", refreshSettings);
    return () => {
      window.removeEventListener("site_settings_updated", refreshSettings);
    };
  }, [refreshSettings]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
