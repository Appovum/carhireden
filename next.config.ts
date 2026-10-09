import type { NextConfig } from "next";

// Keep in sync with MONTH_NAMES and FIRST_SUPPORTED_YEAR in
// src/lib/seo/programmaticRoute.ts (inlined: the config is loaded before the app).
const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,

  async rewrites() {
    return [
      {
        // Programmatic SEO pages: /nike-coupons-august-2026 is served by
        // /seo-coupons/[slug]. Only URLs of exactly this shape (real month name,
        // year 2020–2099) are rewritten, so every other unknown URL keeps Next's
        // normal, real 404. The page validates the year window and the store.
        source: `/:slug([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*-coupons-(?:${MONTHS})-20[2-9][0-9])`,
        destination: "/seo-coupons/:slug",
      },
    ];
  },
};

export default nextConfig;
