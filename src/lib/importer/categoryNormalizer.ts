// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Canonical Category Taxonomy & Normalizer
// Maps messy network sector strings (Awin, CJ, etc.) to 10 clean canonical categories.
// ═══════════════════════════════════════════════════════════════════

export interface CanonicalCategory {
  name: string;
  slug: string;
  icon: string;
}

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { name: "Fashion", slug: "fashion", icon: "shirt" },
  { name: "Electronics", slug: "electronics", icon: "laptop" },
  { name: "Home & Garden", slug: "home", icon: "house" },
  { name: "Travel", slug: "travel", icon: "plane" },
  { name: "Food & Dining", slug: "food", icon: "utensils" },
  { name: "Beauty & Care", slug: "beauty", icon: "sparkles" },
  { name: "Health & Fitness", slug: "health", icon: "activity" },
  { name: "Entertainment", slug: "entertainment", icon: "gamepad" },
  { name: "Services", slug: "services", icon: "zap" },
  { name: "Other", slug: "other", icon: "tag" },
];

/**
 * Maps raw network category/sector strings from CJ, Awin, etc. into a fixed set of 10 clean canonical categories.
 */
export function mapToCanonicalCategory(rawSectorName?: string | null): CanonicalCategory {
  if (!rawSectorName || !rawSectorName.trim()) {
    return CANONICAL_CATEGORIES[9]; // Other
  }

  const clean = rawSectorName
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .toLowerCase()
    .trim();

  // 1. Fashion & Apparel
  if (
    /fashion|clothing|apparel|shoe|footwear|accessories|jewelry|bag|style|department|mall|retail/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[0];
  }

  // 2. Electronics & Tech
  if (
    /computer|electronics|tech|hardware|software|mobile|cell|telecom|gadget|camera|audio|video|tv|gaming|game/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[1];
  }

  // 3. Home & Garden
  if (
    /home|garden|furniture|decor|kitchen|appliance|bed|bath|tool|hardware|lawn|outdoor|pet|animal/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[2];
  }

  // 4. Travel & Hotels
  if (
    /travel|hotel|flight|airline|vacation|cruise|car rental|resort|tourism|booking|luggage/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[3];
  }

  // 5. Food & Dining
  if (
    /food|dining|restaurant|gourmet|beverage|wine|liquor|grocery|meal|snack|drink/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[4];
  }

  // 6. Beauty & Care
  if (
    /beauty|care|cosmetic|skincare|hair|perfume|fragrance|makeup|salon|spa|personal care/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[5];
  }

  // 7. Health & Fitness
  if (
    /health|fitness|sport|wellness|medical|pharmacy|vitamin|supplement|nutrition|exercise|athlete/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[6];
  }

  // 8. Entertainment, Books & Media
  if (
    /entertainment|book|media|movie|music|ticket|toy|hobby|art|craft|event|show/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[7];
  }

  // 9. Services & Business
  if (
    /service|finance|insurance|bank|credit|web|cloud|domain|hosting|automotive|auto|education|course|business|office/i.test(clean)
  ) {
    return CANONICAL_CATEGORIES[8];
  }

  return CANONICAL_CATEGORIES[9]; // Other
}
