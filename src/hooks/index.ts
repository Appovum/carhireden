// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Utility hooks
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Respects prefers-reduced-motion.
 * Returns true when the user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * Copy text to clipboard with success/error state.
 */
export function useCopyToClipboard(): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return { copied, copy };
}

/**
 * Dark mode toggle — Light mode by default.
 */
export function useDarkMode(): {
  isDark: boolean;
  toggle: () => void;
} {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const isCurrentlyDark = root.classList.contains("dark");
    setIsDark(isCurrentlyDark);
  }, []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const willBeDark = !root.classList.contains("dark");

    if (willBeDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
    setIsDark(willBeDark);
  }, []);

  return { isDark, toggle };
}

export { useSiteSettings, SiteSettingsProvider } from "@/context/SiteSettingsContext";
export type { SiteSettings } from "@/context/SiteSettingsContext";
