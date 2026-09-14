// ═══════════════════════════════════════════════════════════════════
// Ad Query Helper — Finds the best active ad creative for a slot
// Priority: image → custom_html → adsense
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

/**
 * Finds the best active ad creative for a given slot position.
 * Prioritizes types that always produce visible content.
 */
export async function findBestAdCreative(positionSlug: string) {
  // Try all enabled creatives for this slot, ordered by type preference
  const allCreatives = await db.adCreative.findMany({
    where: {
      isEnabled: true,
      adSlot: { positionSlug },
    },
    orderBy: { createdAt: "desc" },
  });

  if (allCreatives.length === 0) return null;

  // Prefer: image → custom_html → adsense
  const image = allCreatives.find((c) => c.type === "image");
  if (image) return image;

  const customHtml = allCreatives.find((c) => c.type === "custom_html");
  if (customHtml) return customHtml;

  // Fallback to adsense
  return allCreatives[0];
}
