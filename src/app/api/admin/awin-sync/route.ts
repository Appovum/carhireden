// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Awin Full Sync Route
// POST /api/admin/awin-sync
// Syncs Programmes → Stores (with Category auto-mapping, Description, Sharp WebP Logos, Link Status),
// Promotions (membership: "all") → Coupons & Deals, Transactions → Conversions
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { AwinConnector, AwinProgramme } from "@/lib/connectors/awin";
import { getDomainLogoUrl } from "@/lib/importer/normalizer";
import { processAndSaveStoreLogo } from "@/lib/importer/logoProcessor";
import { mapToCanonicalCategory } from "@/lib/importer/categoryNormalizer";

const connector = new AwinConnector();

export async function POST() {
  const apiKey = process.env.AWIN_API_KEY;
  const publisherId = process.env.AWIN_PUBLISHER_ID;

  if (!apiKey || !publisherId) {
    return NextResponse.json(
      { success: false, error: "AWIN_API_KEY and AWIN_PUBLISHER_ID must be set in .env.local" },
      { status: 400 }
    );
  }

  const credentials = { apiKey, publisherId };
  const results = {
    storesImported: 0,
    storesUpdated: 0,
    categoriesMapped: 0,
    couponsImported: 0,
    couponsUpdated: 0,
    joinedOffersCount: 0,
    unjoinedOffersCount: 0,
    conversionsImported: 0,
    conversionsUpdated: 0,
    noticeMessage: "",
    errors: [] as string[],
  };

  try {
    // Ensure Awin Network record exists
    let network = await db.network.findUnique({ where: { slug: "awin" } });
    if (!network) {
      network = await db.network.create({
        data: {
          name: "Awin",
          slug: "awin",
          isEnabled: true,
          linkTemplate: "https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&clickref={subId}&ued={destinationUrlEncoded}",
          apiCredentialsEncrypted: JSON.stringify(credentials),
        },
      });
    }

    // ── Phase 1: Joined Programmes → Stores & Categories ───────

    let programmes: AwinProgramme[] = [];
    try {
      programmes = await connector.fetchProgrammes(credentials);
    } catch (err: any) {
      results.errors.push(`Programmes fetch failed: ${err.message}`);
    }

    const advertiserToStoreId = new Map<number, string>();

    for (const prog of programmes) {
      try {
        let domain = prog.displayUrl || "";
        if (prog.validDomains && prog.validDomains.length > 0) {
          domain = prog.validDomains[0].domain;
        }
        domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

        const baseSlug = prog.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const storeSlug = `${baseSlug}-awin-${prog.id}`;

        const existingStore = await db.store.findFirst({
          where: {
            OR: [
              { merchantId: String(prog.id) },
              { slug: storeSlug },
              { domain },
            ],
          },
        });

        // Import-time Sharp WebP logo processing
        const rawLogoUrl = prog.logoUrl || `https://ui.awin.com/images/upload/merchant/profile/${prog.id}.png`;
        const processedLogoPath = await processAndSaveStoreLogo(domain, rawLogoUrl, storeSlug);
        const storeLogo = processedLogoPath || existingStore?.logoUrl || null;

        const cleanDescription = prog.description
          ? prog.description.replace(/\r\n/g, "\n").trim().slice(0, 500)
          : null;

        // Check link status: if offline, store isActive = false
        const isOnline = prog.linkStatus ? prog.linkStatus.toLowerCase() === "online" : true;

        let storeRecord;

        if (existingStore) {
          storeRecord = await db.store.update({
            where: { id: existingStore.id },
            data: {
              name: prog.name,
              domain: domain || existingStore.domain,
              logoUrl: storeLogo,
              description: cleanDescription || existingStore.description,
              metaDescription: cleanDescription ? `Get latest promo codes & cashback for ${prog.name}. ${cleanDescription.slice(0, 140)}` : existingStore.metaDescription,
              rawDestinationUrl: prog.clickThroughUrl || existingStore.rawDestinationUrl,
              merchantId: String(prog.id),
              affiliateNetworkId: network.id,
              isActive: isOnline,
            },
          });
          advertiserToStoreId.set(prog.id, storeRecord.id);
          results.storesUpdated++;
        } else {
          storeRecord = await db.store.create({
            data: {
              name: prog.name,
              slug: storeSlug,
              domain: domain || `advertiser-${prog.id}.com`,
              logoUrl: storeLogo,
              description: cleanDescription,
              metaDescription: cleanDescription ? `Get latest promo codes & cashback for ${prog.name}. ${cleanDescription.slice(0, 140)}` : undefined,
              rawDestinationUrl: prog.clickThroughUrl || `https://${domain}`,
              merchantId: String(prog.id),
              affiliateNetworkId: network.id,
              defaultCashbackRate: "Up to 5%",
              isActive: isOnline,
              isFeatured: false,
              successRate: 95,
            },
          });
          advertiserToStoreId.set(prog.id, storeRecord.id);
          results.storesImported++;
        }

        // Primary Sector → Canonical Category Taxonomy Mapping
        const primarySectorName =
          typeof prog.primarySector === "string"
            ? prog.primarySector
            : (prog.primarySector as any)?.name;

        const canonical = mapToCanonicalCategory(primarySectorName);
        const category = await db.category.upsert({
          where: { slug: canonical.slug },
          update: { name: canonical.name, icon: canonical.icon },
          create: {
            name: canonical.name,
            slug: canonical.slug,
            icon: canonical.icon,
          },
        });

        await db.storeCategory.upsert({
          where: {
            storeId_categoryId: {
              storeId: storeRecord.id,
              categoryId: category.id,
            },
          },
          update: {},
          create: {
            storeId: storeRecord.id,
            categoryId: category.id,
          },
        });
        results.categoriesMapped++;
      } catch (err: any) {
        results.errors.push(`Store "${prog.name}" (${prog.id}): ${err.message}`);
      }
    }

    // ── Phase 2: Network-wide Promotions → Coupons & Deals ────

    try {
      const regionSetting = await db.setting.findUnique({
        where: { key: "defaultRegion" },
      });
      const defaultRegion = regionSetting ? JSON.parse(regionSetting.valueJson) : "US";

      // Pull up to 5 pages (500 network-wide offers per sync run)
      const offers = await connector.fetchOffers(credentials, { maxPages: 5, targetRegion: defaultRegion });

      for (const offer of offers) {
        try {
          const advertiserId = parseInt(offer.merchantId, 10);
          let storeId = advertiserToStoreId.get(advertiserId);

          if (!storeId) {
            let store = await db.store.findFirst({
              where: {
                OR: [
                  { merchantId: String(advertiserId) },
                  { name: { equals: offer.merchantName } },
                ],
              },
            });

            if (!store) {
              const baseSlug = offer.merchantName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              const storeSlug = `${baseSlug}-awin-${advertiserId}`;

              const domain = (() => {
                try {
                  return new URL(offer.destinationUrl).hostname.replace(/^www\./, "");
                } catch {
                  return `${storeSlug}.com`;
                }
              })();

              const rawLogoUrl = `https://ui.awin.com/images/upload/merchant/profile/${advertiserId}.png`;
              const processedLogoPath = await processAndSaveStoreLogo(domain, rawLogoUrl, storeSlug);

              store = await db.store.create({
                data: {
                  name: offer.merchantName,
                  slug: storeSlug,
                  domain,
                  logoUrl: processedLogoPath || null,
                  rawDestinationUrl: offer.destinationUrl,
                  merchantId: String(advertiserId),
                  affiliateNetworkId: network.id,
                  defaultCashbackRate: "Up to 5%",
                  isActive: true,
                  successRate: 95,
                },
              });
              results.storesImported++;
            } else if (!store.affiliateNetworkId || !store.merchantId || !store.logoUrl) {
              const storeSlug = store.slug;
              const rawLogoUrl = `https://ui.awin.com/images/upload/merchant/profile/${advertiserId}.png`;
              const processedLogoPath = await processAndSaveStoreLogo(store.domain, rawLogoUrl, storeSlug);

              await db.store.update({
                where: { id: store.id },
                data: {
                  merchantId: String(advertiserId),
                  affiliateNetworkId: network.id,
                  logoUrl: store.logoUrl || processedLogoPath || null,
                  isActive: true,
                },
              });
            }

            storeId = store.id;
            advertiserToStoreId.set(advertiserId, storeId);
          }

          const couponPayload = connector.mapToCoupon(offer, storeId);

          if (couponPayload.type === "code") {
            results.joinedOffersCount++;
          } else {
            results.unjoinedOffersCount++;
          }

          const existing = await db.coupon.findUnique({
            where: { dedupeHash: couponPayload.dedupeHash },
          });

          if (existing) {
            await db.coupon.update({
              where: { id: existing.id },
              data: {
                title: couponPayload.title,
                description: couponPayload.description,
                code: couponPayload.code,
                type: couponPayload.type,
                discountText: couponPayload.discountText,
                destinationUrl: couponPayload.destinationUrl,
                expiresAt: couponPayload.expiresAt,
              },
            });
            results.couponsUpdated++;
          } else {
            await db.coupon.create({
              data: {
                ...couponPayload,
                networkId: network.id,
              },
            });
            results.couponsImported++;
          }
        } catch (err: any) {
          results.errors.push(`Coupon "${offer.title}" (${offer.networkOfferId}): ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`Promotions fetch failed: ${err.message}`);
    }

    // Notice message for unjoined deals
    if (results.unjoinedOffersCount > 0) {
      results.noticeMessage = `${results.unjoinedOffersCount.toLocaleString()} offers imported as deals — join these advertiser programmes in Awin to unlock their voucher codes.`;
    }

    // ── Phase 3: Transactions → Conversions ───────────────────

    try {
      const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const conversions = await connector.fetchConversions(credentials, sinceDate);

      for (const conv of conversions) {
        try {
          const advertiserId = parseInt(conv.merchantId, 10);
          const storeId = advertiserToStoreId.get(advertiserId);

          if (!storeId) continue;

          let clickId: string | null = null;
          if (conv.clickRef) {
            const clickRecord = await db.click.findUnique({
              where: { id: conv.clickRef },
            });
            if (clickRecord) {
              clickId = clickRecord.id;
            }
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
      results.errors.push(`Transactions fetch failed: ${err.message}`);
    }

    // Update ImportSource lastSyncedAt
    const importSource = await db.importSource.findFirst({
      where: { networkId: network.id },
    });
    if (importSource) {
      await db.importSource.update({
        where: { id: importSource.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    // Log Audit
    await db.auditLog.create({
      data: {
        action: "awin_network_sync",
        resource: "network",
        resourceId: network.id,
        detailsJson: JSON.stringify({
          storesImported: results.storesImported,
          categoriesMapped: results.categoriesMapped,
          couponsImported: results.couponsImported,
          joinedOffersCount: results.joinedOffersCount,
          unjoinedOffersCount: results.unjoinedOffersCount,
          conversionsImported: results.conversionsImported,
        }),
      },
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error("Awin sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message, details: results },
      { status: 500 }
    );
  }
}
