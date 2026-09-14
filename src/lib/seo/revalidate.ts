// ═══════════════════════════════════════════════════════════════════
// CouponPilot — On-Demand ISR Revalidation Runner
// Triggers Next.js revalidatePath when imports insert/update coupons.
// ═══════════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";

export async function revalidateStorePages(storeSlug: string): Promise<boolean> {
  try {
    revalidatePath(`/store/${storeSlug}`);
    revalidatePath("/");
    return true;
  } catch (err) {
    // In test environment revalidatePath may not be available; fail gracefully
    return false;
  }
}
