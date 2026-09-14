// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Store Link Tester API Route
// Route: POST /api/admin/stores/test-link
// Validates a store's affiliate link configuration and returns the live generated URL.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAffiliateLink, LinkStrategy } from "@/lib/linkBuilder";
import { decryptSecret } from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  try {
    const { storeId } = await request.json().catch(() => ({}));

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "storeId is required" },
        { status: 400 }
      );
    }

    const store = await db.store.findUnique({
      where: { id: storeId },
      include: {
        coupons: { take: 1, where: { status: "active" } },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    // Resolve network
    const network = store.affiliateNetworkId
      ? await db.network.findUnique({ where: { id: store.affiliateNetworkId } })
      : await db.network.findFirst({ where: { isEnabled: true } });

    const issues: string[] = [];

    if (!store.merchantId) {
      issues.push("Store has no Merchant / Advertiser ID (merchantId is null).");
    }

    if (!network) {
      issues.push("No active affiliate network associated with this store.");
    }

    let publisherId: string | null = null;
    if (network?.apiCredentialsEncrypted) {
      try {
        const decrypted = decryptSecret(network.apiCredentialsEncrypted);
        const parsed = JSON.parse(decrypted);
        publisherId = parsed.publisherId || parsed.affiliateId || parsed.publisher_id || null;
      } catch {
        publisherId = null;
      }
    }

    // Fallback to env vars for publisher ID
    if (!publisherId && network) {
      if (network.slug === "cj") {
        publisherId = process.env.CJ_PUBLISHER_ID || null;
      } else if (network.slug === "awin") {
        publisherId = process.env.AWIN_PUBLISHER_ID || null;
      }
    }

    if (network && !publisherId) {
      issues.push(`Network "${network.name}" is missing publisher credentials / Publisher ID.`);
    }

    // Determine strategy and destination URL based on network
    const isCj = network?.slug === "cj";
    const strategy: LinkStrategy = isCj ? "append_subid" : "template";

    // For CJ: prefer the coupon's stored clickUrl (may be a deep link from Link Search).
    // Only fall back to bare click-{CID}-{merchantId} (homepage) if no coupon clickUrl exists.
    // For Awin: use the merchant destination URL with template interpolation.
    let destinationUrl: string;
    const sampleCoupon = store.coupons[0];

    if (isCj) {
      const couponDest = sampleCoupon?.destinationUrl || "";
      // CJ click URLs use various domains
      const isCjClickUrl = /anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|kqzyfj\.com/.test(couponDest);
      if (isCjClickUrl) {
        // Use the stored CJ click URL verbatim (may include ?url= deep link)
        destinationUrl = couponDest;
      } else if (store.merchantId && publisherId) {
        // Homepage fallback — no real click URL available
        destinationUrl = `https://www.anrdoezrs.net/click-${publisherId}-${store.merchantId}`;
      } else {
        destinationUrl = store.rawDestinationUrl;
      }
    } else {
      destinationUrl = sampleCoupon?.destinationUrl || store.rawDestinationUrl;
    }

    let testLink = destinationUrl;
    let isValid = false;

    if (issues.length === 0 && network) {
      try {
        testLink = buildAffiliateLink({
          strategy,
          linkTemplate: isCj ? null : network.linkTemplate, // CJ doesn't use templates
          affiliateId: publisherId,
          merchantId: store.merchantId,
          subId: "test_click_sample",
          destinationUrl,
        });
        isValid = true;
      } catch (err: any) {
        issues.push(`Link build failed: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      storeName: store.name,
      networkName: network?.name || "None",
      networkSlug: network?.slug || null,
      merchantId: store.merchantId,
      publisherId,
      strategy,
      isValid,
      testLink,
      issues,
    });
  } catch (error: any) {
    console.error("Test link error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate test link" },
      { status: 500 }
    );
  }
}
