"use client";

import Link from "next/link";
import { useSiteSettings } from "@/hooks";
import { useTranslation } from "@/context/LanguageContext";
import { LanguageSelector } from "./LanguageSelector";

export function Footer() {
  const { site_name } = useSiteSettings();
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-rule bg-paper-raised">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg
                width="20"
                height="20"
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
              </svg>
              <span className="font-display font-bold text-[14px] text-ink">
                {site_name}
              </span>
            </div>
            <p className="text-[12px] font-body text-muted max-w-xs">
              Verified coupon codes and cashback. Every code is tested before
              it&apos;s listed.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-body font-medium text-muted uppercase tracking-wider">
                Company
              </span>
              <Link
                href="/about"
                className="text-[13px] font-body text-ink hover:text-muted transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-[13px] font-body text-ink hover:text-muted transition-colors"
              >
                {t("footer.contact_support", "Contact Support")}
              </Link>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-body font-medium text-muted uppercase tracking-wider">
                Legal
              </span>
              <Link
                href="/privacy"
                className="text-[13px] font-body text-ink hover:text-muted transition-colors"
              >
                {t("footer.privacy_policy", "Privacy Policy")}
              </Link>
              <Link
                href="/terms"
                className="text-[13px] font-body text-ink hover:text-muted transition-colors"
              >
                {t("footer.terms_of_service", "Terms of Service")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-rule flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] font-body text-muted">
          <div>
            © {new Date().getFullYear()} {site_name}. {t("footer.rights_reserved", "All rights reserved.")}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-mono text-muted">Language:</span>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
