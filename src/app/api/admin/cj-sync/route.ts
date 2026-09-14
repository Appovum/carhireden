// ═══════════════════════════════════════════════════════════════════
// CouponPilot — CJ Affiliate Full Sync Route
// POST /api/admin/cj-sync
// Syncs Advertiser Lookup → Stores, Link Search → Coupons & Deals,
// Commission Detail GraphQL → Conversions
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { CJConnector } from "@/lib/connectors/cj";
import { mapToCanonicalCategory } from "@/lib/importer/categoryNormalizer";

const connector = new CJConnector();

export async function POST() {
  const pat = process.env.CJ_PERSONAL_ACCESS_TOKEN;
  const publisherId = process.env.CJ_PUBLISHER_ID;

  if (!pat || !publisherId) {
    return NextResponse.json(
      { success: false, error: "CJ_PERSONAL_ACCESS_TOKEN and CJ_PUBLISHER_ID must be set in .env.local" },
      { status: 400 }
    );
  }

  const credentials = { accessToken: pat, publisherId, websiteId: publisherId };
  const results = {
    storesImported: 0,
    storesUpdated: 0,
    categoriesMapped: 0,
    couponsImported: 0,
    couponsUpdated: 0,
    conversionsImported: 0,
    conversionsUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Ensure CJ Network record exists
    let network = await db.network.findUnique({ where: { slug: "cj" } });
    if (!network) {
      network = await db.network.create({
        data: {
          name: "CJ Affiliate",
          slug: "cj",
          isEnabled: true,
          linkTemplate: "append_subid",
          apiCredentialsEncrypted: JSON.stringify(credentials),
        },
      });
    }

    // ── Phase 1: Advertiser Lookup → Stores & Categories ───────

    const advertiserToStoreId = new Map<string, string>();

    try {
      const stores = await connector.fetchStores(credentials);

      for (const store of stores) {
        try {
          const baseSlug = store.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const storeSlug = `${baseSlug}-cj-${store.merchantId}`;

          const existingStore = await db.store.findFirst({
            where: {
              OR: [
                { merchantId: store.merchantId },
                { slug: storeSlug },
                { domain: store.domain },
              ],
            },
          });

          if (existingStore) {
            await db.store.update({
              where: { id: existingStore.id },
              data: {
                name: store.name,
                domain: store.domain || existingStore.domain,
                rawDestinationUrl: store.rawDestinationUrl || existingStore.rawDestinationUrl,
                merchantId: store.merchantId,
                affiliateNetworkId: network.id,
                defaultCashbackRate: store.defaultCashbackRate || existingStore.defaultCashbackRate,
                isActive: true,
              },
            });
            advertiserToStoreId.set(store.merchantId, existingStore.id);
            results.storesUpdated++;
          } else {
            const created = await db.store.create({
              data: {
                name: store.name,
                slug: storeSlug,
                domain: store.domain || `advertiser-${store.merchantId}.com`,
                rawDestinationUrl: store.rawDestinationUrl || `https://${store.domain}`,
                merchantId: store.merchantId,
                affiliateNetworkId: network.id,
                defaultCashbackRate: store.defaultCashbackRate || "Up to 5%",
                isActive: true,
                isFeatured: false,
                successRate: 95,
              },
            });
            advertiserToStoreId.set(store.merchantId, created.id);
            results.storesImported++;
          }

          // Canonical Category Taxonomy Mapping
          const canonical = mapToCanonicalCategory(store.category);
          const category = await db.category.upsert({
            where: { slug: canonical.slug },
            update: { name: canonical.name, icon: canonical.icon },
            create: { name: canonical.name, slug: canonical.slug, icon: canonical.icon },
          });

          const storeId = advertiserToStoreId.get(store.merchantId)!;
          await db.storeCategory.upsert({
            where: {
              storeId_categoryId: { storeId, categoryId: category.id },
            },
            update: {},
            create: { storeId, categoryId: category.id },
          });
          results.categoriesMapped++;
        } catch (err: any) {
          results.errors.push(`Store "${store.name}" (${store.merchantId}): ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`CJ Advertiser Lookup failed: ${err.message}`);
    }

    // ── Phase 2: Link Search → Coupons & Deals ────────────────

    try {
      const offers = await connector.fetchOffers(credentials);

      for (const offer of offers) {
        try {
          let storeId = advertiserToStoreId.get(offer.merchantId);

          if (!storeId) {
            let store = await db.store.findFirst({
              where: {
                OR: [
                  { merchantId: offer.merchantId },
                  { name: { equals: offer.merchantName } },
                ],
              },
            });

            if (!store) {
              const baseSlug = offer.merchantName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              const storeSlug = `${baseSlug}-cj-${offer.merchantId}`;

              const domain = (() => {
                try {
                  return new URL(offer.destinationUrl).hostname.replace(/^www\./, "");
                } catch {
                  return `${storeSlug}.com`;
                }
              })();

              store = await db.store.create({
                data: {
                  name: offer.merchantName,
                  slug: storeSlug,
                  domain,
                  rawDestinationUrl: offer.destinationUrl,
                  merchantId: offer.merchantId,
                  affiliateNetworkId: network.id,
                  defaultCashbackRate: "Up to 5%",
                  isActive: true,
                  successRate: 95,
                },
              });
              results.storesImported++;
            }

            storeId = store.id;
            advertiserToStoreId.set(offer.merchantId, storeId);
          }

          const dedupeInput = `cj_${offer.networkOfferId}_${offer.merchantId}`;
          const dedupeHash = crypto.createHash("md5").update(dedupeInput).digest("hex");

          const couponType = offer.code ? "code" : "deal";

          const existing = await db.coupon.findUnique({
            where: { dedupeHash },
          });

          if (existing) {
            await db.coupon.update({
              where: { id: existing.id },
              data: {
                title: offer.title,
                description: offer.description,
                code: offer.code,
                type: couponType,
                discountText: offer.discountText,
                destinationUrl: offer.destinationUrl,
                expiresAt: offer.endDate,
              },
            });
            results.couponsUpdated++;
          } else {
            await db.coupon.create({
              data: {
                storeId,
                networkId: network.id,
                title: offer.title,
                description: offer.description,
                code: offer.code,
                type: couponType as any,
                status: "active",
                discountText: offer.discountText,
                discountType: offer.discountType,
                destinationUrl: offer.destinationUrl,
                dedupeHash,
                expiresAt: offer.endDate,
              },
            });
            results.couponsImported++;
          }
        } catch (err: any) {
          results.errors.push(`Coupon "${offer.title}" (${offer.networkOfferId}): ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`CJ Link Search failed: ${err.message}`);
    }

    // ── Phase 3: Commission Detail → Conversions ──────────────

    try {
      const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const conversions = await connector.fetchConversions(credentials, sinceDate);

      for (const conv of conversions) {
        try {
          const storeId = advertiserToStoreId.get(conv.merchantId);
          if (!storeId) continue;

          let clickId: string | null = null;
          if (conv.clickRef) {
            const clickRecord = await db.click.findUnique({
              where: { id: conv.clickRef },
            });
            if (clickRecord) clickId = clickRecord.id;
          }

          const cashbackMinor = Math.round(conv.commissionMinor * 0.5);

          const existing = await db.conversion.findFirst({
            where: {
              networkId: network.id,
              networkTransactionId: conv.networkTransactionId,
            },
          });

          if (existing) {
            await db.conversion.update({
              where: { id: existing.id },
              data: {
                status: conv.status,
                commissionMinor: conv.commissionMinor,
                amountMinor: conv.amountMinor,
                cashbackMinor,
              },
            });
            results.conversionsUpdated++;
          } else {
            await db.conversion.create({
              data: {
                networkId: network.id,
                networkTransactionId: conv.networkTransactionId,
                storeId,
                clickId,
                amountMinor: conv.amountMinor,
                commissionMinor: conv.commissionMinor,
                cashbackMinor,
                currency: conv.currency,
                status: conv.status,
                transactionDate: conv.transactionDate,
                rawDataJson: conv.rawDataJson,
              },
            });
            results.conversionsImported++;
          }
        } catch (err: any) {
          results.errors.push(`Conversion ${conv.networkTransactionId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`CJ Commissions fetch failed: ${err.message}`);
    }

    // Log Audit
    await db.auditLog.create({
      data: {
        action: "cj_network_sync",
        resource: "network",
        resourceId: network.id,
        detailsJson: JSON.stringify({
          storesImported: results.storesImported,
          categoriesMapped: results.categoriesMapped,
          couponsImported: results.couponsImported,
          conversionsImported: results.conversionsImported,
        }),
      },
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error("CJ sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message, details: results },
      { status: 500 }
    );
  }
}
