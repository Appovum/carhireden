// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Merchant Auto-Mapper
// Maps network merchant IDs and names to database Store records.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export async function findOrCreateMappedStore(
  merchantId: string,
  merchantName: string,
  networkId?: string,
  rawDestinationUrl?: string
): Promise<{ storeId: string; autoCreated: boolean }> {
  // 1. Try matching by merchantId
  const byMerchantId = await db.store.findFirst({
    where: { merchantId },
  });
  if (byMerchantId) {
    return { storeId: byMerchantId.id, autoCreated: false };
  }

  // 2. Try matching by slug or exact name (case-insensitive)
  const slug = merchantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const byName = await db.store.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: merchantName } }],
    },
  });
  if (byName) {
    // Associate merchantId & affiliateNetworkId to existing store for future matches
    await db.store.update({
      where: { id: byName.id },
      data: {
        merchantId,
        ...(networkId ? { affiliateNetworkId: networkId } : {}),
      },
    });
    return { storeId: byName.id, autoCreated: false };
  }

  // 3. Fallback: Create draft store in review queue
  const domain = rawDestinationUrl
    ? (() => {
        try {
          return new URL(rawDestinationUrl).hostname.replace(/^www\./, "");
        } catch {
          return `${slug}.com`;
        }
      })()
    : `${slug}.com`;

  const newStore = await db.store.create({
    data: {
      name: merchantName,
      slug,
      domain,
      merchantId,
      affiliateNetworkId: networkId || null,
      rawDestinationUrl: rawDestinationUrl || `https://${domain}`,
      isActive: false, // Flagged for admin review
      description: "Auto-created merchant pending admin review.",
    },
  });

  return { storeId: newStore.id, autoCreated: true };
}
