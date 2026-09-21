// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Affiliate Outbound Redirect Handler
// Route: GET /go/[clickId]
// Revenue Path: Log click, construct affiliate deep link, 302 redirect.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { detectBot } from "@/lib/botDetector";
import { buildAffiliateLink, LinkStrategy } from "@/lib/linkBuilder";
import { decryptSecret } from "@/lib/security/crypto";

export const dynamic = "force-dynamic";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clickId: string }> }
) {
  const { clickId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const couponId = searchParams.get("couponId");
  const storeId = searchParams.get("storeId");
  const userId = searchParams.get("userId");

  // Extract client metadata
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ipHash = hashIp(clientIp);

  // Bot detection
  const botResult = detectBot(userAgent);

  // Lookup coupon & store details
  const coupon = couponId
    ? await db.coupon.findUnique({
        where: { id: couponId },
        include: { store: true, network: true },
      })
    : null;

  let store = coupon?.store;
  if (!store && storeId) {
    store = (await db.store.findUnique({
      where: { id: storeId },
    })) ?? undefined;
  }

  // Network resolution:
  let network = coupon?.network || (store?.affiliateNetworkId
    ? await db.network.findUnique({ where: { id: store.affiliateNetworkId } })
    : null);

  if (!network && store?.merchantId) {
    network = await db.network.findFirst({ where: { isEnabled: true } });
  }

  // Parse credentials if encrypted credentials stored
  let affiliateId: string | null = null;
  if (network?.apiCredentialsEncrypted) {
    try {
      const decrypted = decryptSecret(network.apiCredentialsEncrypted);
      const parsed = JSON.parse(decrypted);
      affiliateId = parsed.affiliateId || parsed.publisherId || null;
    } catch {
      affiliateId = null;
    }
  }

  // Fallback to env vars for publisher ID
  if (!affiliateId && network) {
    if (network.slug === "cj") {
      affiliateId = process.env.CJ_PUBLISHER_ID || null;
    } else if (network.slug === "awin") {
      affiliateId = process.env.AWIN_PUBLISHER_ID || null;
    }
  }

  // Detect sample/placeholder affiliate IDs to prevent network inactive redirect errors in demo/sample mode
  const isSampleAffiliateId = (id: string | null): boolean => {
    if (!id) return true;
    const lower = id.trim().toLowerCase();
    return (
      lower === "123456" ||
      lower.includes("sample") ||
      lower.includes("demo") ||
      lower.includes("your_") ||
      lower.includes("placeholder")
    );
  };

  const enableLiveAffiliateLinks = process.env.ENABLE_LIVE_AFFILIATE_LINKS === "true" && process.env.NEXT_PUBLIC_DEMO_MODE !== "true";
  const hasRealAffiliateId = !isSampleAffiliateId(affiliateId);
  const isCj = network?.slug === "cj";
  const strategy: LinkStrategy = isCj ? "append_subid" : "template";

  // Clean merchant destination URL (e.g. https://nike.com, https://rosettastone.com)
  const merchantFallbackUrl =
    coupon?.destinationUrl && !coupon.destinationUrl.includes("awin1.com") && !coupon.destinationUrl.includes("anrdoezrs.net")
      ? coupon.destinationUrl
      : store?.rawDestinationUrl || (store?.domain ? (store.domain.startsWith("http") ? store.domain : `https://${store.domain}`) : request.nextUrl.origin);

  let rawDestinationUrl: string;
  if (enableLiveAffiliateLinks && isCj && store?.merchantId && hasRealAffiliateId) {
    const couponDest = coupon?.destinationUrl || "";
    if (couponDest.includes("anrdoezrs.net") || couponDest.includes("dpbolvw.net") || couponDest.includes("jdoqocy.com") || couponDest.includes("tkqlhce.com") || couponDest.includes("kqzyfj.com")) {
      rawDestinationUrl = couponDest;
    } else {
      rawDestinationUrl = `https://www.anrdoezrs.net/click-${affiliateId}-${store.merchantId}`;
    }
  } else {
    rawDestinationUrl = merchantFallbackUrl;
  }

  // Build deep link safely ONLY if live affiliate links are explicitly enabled and real credentials exist
  let finalUrl = merchantFallbackUrl;
  if (enableLiveAffiliateLinks && hasRealAffiliateId && network?.isEnabled) {
    try {
      finalUrl = buildAffiliateLink({
        strategy,
        linkTemplate: isCj ? null : network.linkTemplate,
        affiliateId,
        merchantId: store?.merchantId,
        subId: clickId,
        destinationUrl: rawDestinationUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[LinkBuilder Failure] Click ${clickId}: ${msg}. Falling back to merchantFallbackUrl.`);
      finalUrl = merchantFallbackUrl;
    }
  }

  // Log click asynchronously to DB
  try {
    if (store) {
      await db.click.create({
        data: {
          id: clickId,
          subId: clickId,
          couponId: coupon?.id || null,
          storeId: store.id,
          networkId: network?.id || null,
          ipHash,
          userAgent,
          referer,
          botScore: botResult.botScore,
          isBot: botResult.isBot,
          rawDestinationUrl,
          finalUrl,
          userId: userId || null,
        },
      });

      // Increment coupon usage if present
      if (coupon) {
        await db.coupon.update({
          where: { id: coupon.id },
          data: {
            usedCount: { increment: 1 },
            usedTodayCount: { increment: 1 },
          },
        });
      }
    }
  } catch (err) {
    console.error("Failed to log click in /go/[clickId]:", err);
  }

  // Build 302 Found response with noindex header
  return NextResponse.redirect(finalUrl, {
    status: 302,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
