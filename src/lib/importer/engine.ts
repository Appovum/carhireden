// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Import Pipeline Engine
// Idempotent batch import runner, dry-run preview, and run logging.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { parseDiscountFromTitle, stripTrackingParams } from "./normalizer";
import { findOrCreateMappedStore } from "./merchantMapper";

export interface ImportOptions {
  dryRun?: boolean;
  fixtureOffers?: any[]; // Optional override for fixture testing
}

export interface ImportRunResult {
  importRunId?: string;
  dryRun: boolean;
  itemsProcessed: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsFailed: number;
  errors: string[];
  previewItems?: any[];
}

export async function runImport(
  importSourceId: string,
  options: ImportOptions = {}
): Promise<ImportRunResult> {
  const { dryRun = false } = options;

  const importSource = await db.importSource.findUnique({
    where: { id: importSourceId },
    include: { network: true },
  });

  if (!importSource) {
    throw new Error(`ImportSource not found: ${importSourceId}`);
  }

  const connector = getConnector(importSource.network.slug);
  if (!connector) {
    throw new Error(`No connector registered for network: ${importSource.network.slug}`);
  }

  // Create ImportRun record if not a dry-run
  let importRunRecord = dryRun
    ? null
    : await db.importRun.create({
        data: {
          importSourceId,
          status: "running",
          startedAt: new Date(),
        },
      });

  const credentials = importSource.network.apiCredentialsEncrypted
    ? JSON.parse(importSource.network.apiCredentialsEncrypted)
    : {};

  let itemsProcessed = 0;
  let itemsInserted = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  const errors: string[] = [];
  const previewItems: any[] = [];

  try {
    const rawOffers = await connector.fetchOffers(credentials, {
      fixtureData: options.fixtureOffers,
    });

    for (const offer of rawOffers) {
      itemsProcessed++;
      try {
        // 1. Clean tracking parameters from destination URL
        const cleanUrl = stripTrackingParams(offer.destinationUrl);
        offer.destinationUrl = cleanUrl;

        // 2. Parse discount details
        const discountInfo = parseDiscountFromTitle(offer.title, offer.discountText);
        offer.discountText = discountInfo.discountText;
        offer.discountType = discountInfo.discountType;
        offer.discountValue = discountInfo.discountValue;

        // 3. Map merchant to store
        const storeMapping = dryRun
          ? { storeId: "dry_run_store_id", autoCreated: false }
          : await findOrCreateMappedStore(
              offer.merchantId,
              offer.merchantName,
              importSource.networkId,
              cleanUrl
            );

        // 4. Generate mapped coupon payload with dedupe hash
        const couponPayload = connector.mapToCoupon(offer, storeMapping.storeId);

        if (dryRun) {
          previewItems.push({
            ...couponPayload,
            merchantName: offer.merchantName,
            networkName: importSource.network.name,
          });
          continue;
        }

        // 5. Idempotent Upsert Check via dedupeHash
        const existing = await db.coupon.findUnique({
          where: { dedupeHash: couponPayload.dedupeHash },
        });

        if (existing) {
          // Update coupon if fields changed
          await db.coupon.update({
            where: { id: existing.id },
            data: {
              title: couponPayload.title,
              description: couponPayload.description,
              discountText: couponPayload.discountText,
              destinationUrl: couponPayload.destinationUrl,
              expiresAt: couponPayload.expiresAt,
            },
          });
          itemsUpdated++;
        } else {
          // Insert new coupon
          await db.coupon.create({
            data: {
              ...couponPayload,
              importSourceId: importSource.id,
              networkId: importSource.networkId,
            },
          });
          itemsInserted++;
        }
      } catch (err: any) {
        itemsFailed++;
        errors.push(`Item ${offer.networkOfferId || itemsProcessed}: ${err.message || String(err)}`);
      }
    }

    // Finalize import run record
    if (importRunRecord) {
      await db.importRun.update({
        where: { id: importRunRecord.id },
        data: {
          status: "completed",
          itemsProcessed,
          itemsInserted,
          itemsUpdated,
          itemsFailed,
          errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
          completedAt: new Date(),
        },
      });

      await db.importSource.update({
        where: { id: importSourceId },
        data: { lastSyncedAt: new Date() },
      });
    }
  } catch (err: any) {
    if (importRunRecord) {
      await db.importRun.update({
        where: { id: importRunRecord.id },
        data: {
          status: "failed",
          itemsProcessed,
          itemsInserted,
          itemsUpdated,
          itemsFailed: itemsFailed + 1,
          errorsJson: JSON.stringify([...errors, err.message || String(err)]),
          completedAt: new Date(),
        },
      });
    }
    throw err;
  }

  return {
    importRunId: importRunRecord?.id,
    dryRun,
    itemsProcessed,
    itemsInserted,
    itemsUpdated,
    itemsFailed,
    errors,
    previewItems: dryRun ? previewItems : undefined,
  };
}
