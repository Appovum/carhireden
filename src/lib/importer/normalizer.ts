// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Import Normalizer & Feed Sanitizer
// Cleans messy affiliate feed titles, extracts embedded promo codes,
// parses parenthetical & currency savings, and resolves brand logos.
// ═══════════════════════════════════════════════════════════════════

export interface ParsedDiscount {
  discountText: string;
  discountType: "percentage" | "fixed" | "free_shipping" | "other";
  discountValue?: number;
}

export interface CleanedTitleResult {
  title: string;
  extractedCode?: string;
}

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "aff_id",
  "affiliate_id",
];

/**
 * Strips tracking query parameters from destination URLs.
 */
export function stripTrackingParams(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Strips raw feed noise, promo code clauses, and price tags from titles.
 * Extracts promo codes if embedded in title strings.
 */
export function cleanTitleAndExtractCode(rawTitle: string): CleanedTitleResult {
  let title = rawTitle.trim();
  let extractedCode: string | undefined;

  // 1. Extract embedded promo code (e.g. "w/Code: WS24T23", "code: SAVE20", "Promo Code XYZ")
  const codeMatch = title.match(/(?:w\/Code|Code|Promo Code|Use Code|Coupon|Voucher)[:\s]+([A-Z0-9_-]{4,30})/i);
  if (codeMatch) {
    extractedCode = codeMatch[1].toUpperCase();
    title = title.replace(/(?:w\/Code|Code|Promo Code|Use Code|Coupon|Voucher)[:\s]+[A-Z0-9_-]{4,30}/gi, "").trim();
  }

  // 2. Strip price & savings clauses (e.g. "– €455.849425(€272.150575off)", "- $500 ($50 off)", "Save $5 OFF")
  title = title.replace(/[\s\u2013\-]*[\$€£¥₹]\s*\d+(?:\.\d+)?\s*\([\s\$€£¥₹\d.%\w-]*off\)/gi, "").trim();
  title = title.replace(/[\s\u2013\-]*[\$€£¥₹]\s*\d+(?:\.\d+)?/gi, "").trim();
  title = title.replace(/(?:Save|Get)\s*[\$€£¥₹]\s*\d+(?:\.\d+)?\s*(?:OFF|Discount)?/gi, "").trim();
  title = title.replace(/\bSave\s*OFF\b/gi, "").trim();

  // 3. Clean trailing punctuation / dashes / colons
  title = title.replace(/[\s\u2013\-:]+$/g, "").trim();

  return {
    title: title && title.length > 2 ? title : rawTitle,
    extractedCode,
  };
}

/**
 * Parses clean discount labels, numeric values, and discount types from titles & text.
 * Rounds all numeric amounts to 2 decimal places maximum.
 */
export function parseDiscountFromTitle(
  title: string,
  rawDiscountText?: string
): ParsedDiscount {
  const textToSearch = `${rawDiscountText || ""} ${title}`.trim();

  // 1. Check parenthetical savings first (e.g. "(€272.150575off)", "($50 off)", "(20% off)")
  const parenPcntMatch = textToSearch.match(/\((\d+(?:\.\d+)?)\s*%\s*(?:off|discount|save)?\)/i);
  if (parenPcntMatch) {
    const val = Math.round(parseFloat(parenPcntMatch[1]) * 100) / 100;
    return {
      discountText: `${val}% OFF`,
      discountType: "percentage",
      discountValue: val,
    };
  }

  const parenFixedMatch = textToSearch.match(/\(([\$€£¥₹])\s*(\d+(?:\.\d+)?)\s*(?:off|discount|save)?\)/i);
  if (parenFixedMatch) {
    const symbol = parenFixedMatch[1];
    const val = Math.round(parseFloat(parenFixedMatch[2]) * 100) / 100;
    return {
      discountText: `${symbol}${val} OFF`,
      discountType: "fixed",
      discountValue: val,
    };
  }

  // 2. Explicit percentage match (e.g. "20% OFF", "18% off", "50% Discount")
  const percentMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*%\s*(?:off|discount|cashback|save)/i);
  if (percentMatch) {
    const val = Math.round(parseFloat(percentMatch[1]) * 100) / 100;
    return {
      discountText: `${val}% OFF`,
      discountType: "percentage",
      discountValue: val,
    };
  }

  // 3. Explicit fixed savings match (e.g. "Save $25", "€331.2 off", "$10 OFF")
  const fixedMatch = textToSearch.match(/(?:save|off|discount)[:\s]*([\$€£¥₹])\s*(\d+(?:\.\d+)?)|([\$€£¥₹])\s*(\d+(?:\.\d+)?)\s*(?:off|discount|save)/i);
  if (fixedMatch) {
    const symbol = fixedMatch[1] || fixedMatch[3];
    const rawVal = parseFloat(fixedMatch[2] || fixedMatch[4]);
    const val = Math.round(rawVal * 100) / 100;
    return {
      discountText: `${symbol}${val} OFF`,
      discountType: "fixed",
      discountValue: val,
    };
  }

  // 4. Free shipping match
  if (/free\s+(?:express\s+)?(?:shipping|delivery)/i.test(textToSearch)) {
    return {
      discountText: "Free Shipping",
      discountType: "free_shipping",
    };
  }

  // 5. Default fallback: use clean "Deal" or short raw text if <= 15 chars
  const shortRaw = rawDiscountText && rawDiscountText.length <= 15 ? rawDiscountText : null;
  return {
    discountText: shortRaw || "Deal",
    discountType: "other",
  };
}

/**
 * Returns local Sharp WebP logo path or high-res favicon logo URL.
 * Supports local paths (/uploads/logos/*.webp) and remote URLs.
 */
export function getDomainLogoUrl(domain?: string | null, rawLogoUrl?: string | null): string {
  if (rawLogoUrl && (rawLogoUrl.startsWith("/") || rawLogoUrl.startsWith("http"))) {
    return rawLogoUrl;
  }
  if (!domain || domain.trim() === "") {
    return "";
  }
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  
  if (
    cleanDomain === "awin1.com" ||
    cleanDomain.startsWith("advertiser-") ||
    cleanDomain.endsWith(".local") ||
    cleanDomain === "localhost"
  ) {
    return "";
  }
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
}
