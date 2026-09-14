// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Conversion Sync & Attribution Engine
// Pulls network conversions, matches clickRef SubIDs, mirrors status,
// and records unattributed conversions against stores.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { findOrCreateMappedStore } from "@/lib/importer/merchantMapper";
import { calculateShare, createMoney } from "@/lib/money";

export interface SyncOptions {
  since?: Date;
  fixtureData?: any[];
}

export interface SyncResult {
  networkId: string;
  totalSynced: number;
  matchedCount: number;
  unattributedCount: number;
  updatedCount: number;
  insertedCount: number;
}

export async function syncNetworkConversions(
  networkId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const network = await db.network.findUnique({
    where: { id: networkId },
  });

  if (!network) {
    throw new Error(`Network not found: ${networkId}`);
  }

  const connector = getConnector(network.slug);
  if (!connector) {
    throw new Error(`No connector registered for network: ${network.slug}`);
  }

  const credentials = network.apiCredentialsEncrypted
    ? JSON.parse(network.apiCredentialsEncrypted)
    : {};

  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const rawConversions = await connector.fetchConversions(credentials, since, {
    fixtureData: options.fixtureData,
  });

  let matchedCount = 0;
  let unattributedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;

  // Fetch dynamic user cashback split percentage from DB settings (e.g. 50%)
  const splitSetting = await db.setting.findUnique({ where: { key: "cashback_split" } });
  let cashbackSplitPct = 50;
  if (splitSetting) {
    try {
      cashbackSplitPct = parseFloat(JSON.parse(splitSetting.valueJson)) || 50;
    } catch {
      cashbackSplitPct = parseFloat(splitSetting.valueJson) || 50;
    }
  }

  for (const normalized of rawConversions) {
    let clickId: string | null = null;
    let storeId: string | null = null;

    // 1. Match clickRef to Click in DB
    if (normalized.clickRef) {
      const click = await db.click.findUnique({
        where: { id: normalized.clickRef },
        include: { store: true },
      });

      if (click) {
        clickId = click.id;
        storeId = click.storeId;
        matchedCount++;
      }
    }

    // 2. Unattributed fallback: match store by merchantId
    if (!storeId) {
      const mapped = await findOrCreateMappedStore(
        normalized.merchantId,
        normalized.merchantName,
        network.id
      );
      storeId = mapped.storeId;
      unattributedCount++;
    }

    // 3. Dynamic Cashback Allocation based on Admin setting (e.g. 50% user share)
    const commMoney = createMoney(normalized.commissionMinor, normalized.currency);
    const userCashbackMoney = calculateShare(commMoney, cashbackSplitPct);

    // 4. Deduplicate & Upsert on composite key (networkId, networkTransactionId)
    const existing = await db.conversion.findUnique({
      where: {
        networkId_networkTransactionId: {
          networkId: network.id,
          networkTransactionId: normalized.networkTransactionId,
        },
      },
    });

    const confirmedDate =
      normalized.status === "confirmed" ? normalized.confirmedDate || new Date() : null;

    if (existing) {
      await db.conversion.update({
        where: { id: existing.id },
        data: {
          status: normalized.status,
          amountMinor: normalized.amountMinor,
          commissionMinor: normalized.commissionMinor,
          cashbackMinor: userCashbackMoney.amountMinor,
          confirmedDate,
          rawDataJson: normalized.rawDataJson,
        },
      });
      updatedCount++;
    } else {
      await db.conversion.create({
        data: {
          clickId,
          storeId,
          networkId: network.id,
          networkTransactionId: normalized.networkTransactionId,
          amountMinor: normalized.amountMinor,
          commissionMinor: normalized.commissionMinor,
          cashbackMinor: userCashbackMoney.amountMinor,
          currency: normalized.currency,
          status: normalized.status,
          transactionDate: normalized.transactionDate,
          confirmedDate,
          rawDataJson: normalized.rawDataJson,
        },
      });
      insertedCount++;
    }
  }

  return {
    networkId,
    totalSynced: rawConversions.length,
    matchedCount,
    unattributedCount,
    updatedCount,
    insertedCount,
  };
}
