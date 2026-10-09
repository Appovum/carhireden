// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Programmatic SEO URL Parser
// Parses and validates URLs like /nike-coupons-august-2026.
//
// Next.js cannot express "<store>-coupons-<month>-<year>" as a folder name
// (a segment may only be one whole [param]), so next.config.ts rewrites
// matching URLs to /seo-coupons/<slug> and this module validates the slug.
// Anything that does not parse here is a 404.
// ═══════════════════════════════════════════════════════════════════

export const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** Oldest year a programmatic page may reference. */
export const FIRST_SUPPORTED_YEAR = 2020;

const MAX_SLUG_LENGTH = 200;
const SLUG_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)-coupons-([a-z]+)-(\d{4})$/;

export interface ProgrammaticSlug {
  /** Store slug as stored in the database, e.g. "nike". */
  storeSlug: string;
  /** 1–12. */
  month: number;
  /** Display name, e.g. "August". */
  monthLabel: string;
  year: number;
  /** Lowercase form of the whole slug, used for the canonical URL. */
  canonicalSlug: string;
}

/**
 * Returns the parsed parts, or null when the slug is not a valid
 * programmatic page: wrong shape, unknown month, or a year outside
 * FIRST_SUPPORTED_YEAR … next year.
 */
export function parseProgrammaticSlug(raw: string, now: Date = new Date()): ProgrammaticSlug | null {
  const slug = raw.trim().toLowerCase();
  if (!slug || slug.length > MAX_SLUG_LENGTH) return null;

  const match = SLUG_PATTERN.exec(slug);
  if (!match) return null;

  const [, storeSlug, monthName, yearText] = match;
  const monthIndex = (MONTH_NAMES as readonly string[]).indexOf(monthName);
  if (monthIndex === -1) return null;

  const year = Number(yearText);
  if (year < FIRST_SUPPORTED_YEAR || year > now.getFullYear() + 1) return null;

  return {
    storeSlug,
    month: monthIndex + 1,
    monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    year,
    canonicalSlug: slug,
  };
}
