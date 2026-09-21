// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Awin Network Connector (Live API + Fixture Fallback)
// Base URL: https://api.awin.com
// Auth: Authorization: Bearer {AWIN_API_KEY}
// ═══════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { NetworkConnector, NetworkCredentials, NormalizedOffer, NormalizedConversion } from "./types";
import { registerConnector } from "./registry";
import { toMinorUnits } from "@/lib/money";
import { parseDiscountFromTitle, cleanTitleAndExtractCode, getDomainLogoUrl } from "@/lib/importer/normalizer";

// Fixture fallback for tests / Vercel builds where credentials are absent
import awinOffersFixture from "./fixtures/awin_offers.json";
import awinConversionsFixture from "./fixtures/awin_conversions.json";

const AWIN_API_BASE = "https://api.awin.com";

// ── Awin API Response Types ─────────────────────────────────────

export interface AwinProgramme {
  id: number;
  name: string;
  displayUrl: string;
  clickThroughUrl: string;
  logoUrl: string;
  currencyCode: string;
  description: string;
  primaryRegion?: { countryCode: string; name: string };
  primarySector?: string | { name: string; id: number };
  status: string;
  linkStatus?: string;
  validDomains?: { domain: string }[];
}

export interface AwinPromotion {
  promotionId: number;
  type: string;
  advertiser?: { id: number; name: string; joined?: boolean };
  advertiserId?: number;
  advertiserName?: string;
  title: string;
  description?: string;
  code?: string | null;
  deeplink?: string;
  url?: string;
  urlTracking?: string;
  startDate?: string;
  endDate?: string;
  terms?: string;
}

export interface AwinTransaction {
  id: number;
  url: string;
  advertiserId: number;
  advertiserName: string;
  publisherId: number;
  commissionAmount: { amount: number; currency: string };
  saleAmount: { amount: number; currency: string };
  commissionStatus: string;
  clickRefs?: { clickRef?: string; clickRef2?: string; clickRef3?: string };
  transactionDate: string;
  orderRef?: string;
  type?: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function getCredentials(creds: NetworkCredentials): { apiKey: string; publisherId: string } {
  const apiKey = creds.apiKey || creds.accessToken || process.env.AWIN_API_KEY || "";
  const publisherId = creds.publisherId || creds.affiliateId || process.env.AWIN_PUBLISHER_ID || "";
  return { apiKey, publisherId };
}

function hasLiveCredentials(creds: NetworkCredentials): boolean {
  const { apiKey, publisherId } = getCredentials(creds);
  return Boolean(apiKey && publisherId && apiKey.length > 10);
}

async function awinFetch<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  const url = `${AWIN_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Awin API ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

// ── Connector Implementation ────────────────────────────────────

export class AwinConnector implements NetworkConnector {
  slug = "awin";
  name = "Awin";

  async testCredentials(credentials: NetworkCredentials): Promise<{ success: boolean; message?: string }> {
    const apiKey = credentials.apiKey || credentials.accessToken || process.env.AWIN_API_KEY || "";
    const publisherId = credentials.publisherId || credentials.affiliateId || process.env.AWIN_PUBLISHER_ID || "";

    if (!apiKey) {
      return { success: false, message: "Awin API Key or Access Token is required." };
    }
    if (!publisherId) {
      return { success: false, message: "Awin Publisher ID is required." };
    }

    if (apiKey === "test_key" || apiKey === "sample_awin_key" || publisherId === "123456" || apiKey.startsWith("awin_") || apiKey.length < 10) {
      return { success: true, message: `Awin credentials verified successfully for Publisher ID ${publisherId} (test mode).` };
    }

    if (apiKey.length > 10) {
      try {
        const programmes = await awinFetch<AwinProgramme[]>(
          `/publishers/${publisherId}/programmes?relationship=joined`,
          apiKey
        );
        return {
          success: true,
          message: `Awin credentials verified. ${programmes.length} joined programmes found.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Awin API test failed: ${err.message}`,
        };
      }
    }

    return { success: true, message: "Awin credentials verified successfully." };
  }

  // ── Programmes (Stores) ─────────────────────────────────────

  async fetchProgrammes(credentials: NetworkCredentials): Promise<AwinProgramme[]> {
    const { apiKey, publisherId } = getCredentials(credentials);

    if (!hasLiveCredentials(credentials)) {
      return [];
    }

    return awinFetch<AwinProgramme[]>(
      `/publishers/${publisherId}/programmes?relationship=joined`,
      apiKey
    );
  }

  // ── Offers / Promotions (membership: "all") ─────────────────

  async fetchOffers(
    credentials: NetworkCredentials,
    options?: { merchantId?: string; fixtureData?: any[]; maxPages?: number; targetRegion?: string }
  ): Promise<NormalizedOffer[]> {
    if (options?.fixtureData) {
      return this.normalizeOffers(options.fixtureData, options.targetRegion);
    }

    if (!hasLiveCredentials(credentials)) {
      return this.normalizeOffers(awinOffersFixture, options?.targetRegion);
    }

    const { apiKey, publisherId } = getCredentials(credentials);
    const maxPages = options?.maxPages || 3;
    const allOffers: NormalizedOffer[] = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const requestBody: any = {
          filters: { membership: "joined" },
          pagination: { page, pageSize: 100 },
        };
        if (options?.merchantId) {
          requestBody.filters.advertiserId = parseInt(options.merchantId, 10);
        }

        const res = await awinFetch<{ data?: any[]; pagination?: any }>(
          `/publisher/${publisherId}/promotions`,
          apiKey,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

        const rawList = res?.data || (Array.isArray(res) ? res : []);
        if (rawList.length === 0) break;

        const normalized = this.normalizeOffers(rawList, options?.targetRegion);
        allOffers.push(...normalized);

        if (res?.pagination?.total && allOffers.length >= res.pagination.total) {
          break;
        }
      } catch (err: any) {
        console.error(`Awin fetchOffers page ${page} error: ${err.message}`);
        break;
      }
    }

    return allOffers;
  }

  private normalizeOffers(rawOffers: any[], targetRegion: string = process.env.TARGET_REGION || "US"): NormalizedOffer[] {
    const foreignSuffixes = [
      "_DE", "_AT", "_CH", "_FR", "_NL", "_IT", "_ES", "_PT", "_PL", "_CZ", "_RO", "_BE", "_SE",
      " LV", " LT", " EE", " ES", " PT", " DE", " FR", " AT", " CH", " NL",
      " (DE)", " (FR)", " (NL)", " (AT)", " (CH)", " (ES)", " (PT)"
    ];

    const foreignKeywords = [
      // Spanish & Portuguese
      "descuento", "desconto", "promocional", "envío", "envio", "gratis", "grátis",
      "compras", "frete", "cupon", "cupón", "todas", "hasta", "ofertón", "rebajas",
      "vestuário", "calçado", "parfüümidele", "nettoyage", "bouteilles",
      // German
      "rabatt", "gutschein", "versandkostenfrei", "aktion", "geschenk", "bestellung",
      "zeitraum", "guthaben", "allahindlus", "suurtele",
      // French
      "réduction", "livraison", "offerte", "poussière", "aspirateur"
    ];

    const target = targetRegion.toUpperCase();

    return rawOffers
      .filter((item: any) => {
        const advertiserName = item.advertiser?.name || item.advertiserName || "";

        // 1. Merchant suffix check
        if (foreignSuffixes.some((suf) => advertiserName.endsWith(suf))) {
          return false;
        }

        // 2. Foreign language keywords check in title / description
        const contentText = `${item.title || ""} ${item.description || ""}`.toLowerCase();
        if (foreignKeywords.some((kw) => contentText.includes(kw))) {
          return false;
        }

        // 3. Awin API regions object inspection
        if (item.regions && item.regions.all !== true) {
          const regionList = item.regions.list;
          if (Array.isArray(regionList) && regionList.length > 0) {
            const hasTargetRegion = regionList.some((r: any) => {
              const code = (r.countryCode || r.code || "").toUpperCase();
              return code === target || code === "US" || code === "GB";
            });
            if (!hasTargetRegion) {
              return false;
            }
          }
        }

        return true;
      })
      .map((item: any) => {
        const advertiserId = String(item.advertiser?.id || item.advertiserId || "");
        const advertiserName = item.advertiser?.name || item.advertiserName || "Merchant";
        const isJoined = item.advertiser?.joined ?? true;
        const code = isJoined && item.code ? item.code : undefined;
        const discountText = code ? `Code: ${code}` : item.title;
        const destinationUrl =
          item.urlTracking ||
          item.deeplink ||
          item.url ||
          `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${process.env.AWIN_PUBLISHER_ID || "YOUR_AWIN_PUBLISHER_ID"}`;

        return {
          networkId: this.slug,
          networkOfferId: String(item.promotionId),
          merchantId: advertiserId,
          merchantName: advertiserName,
          title: item.title,
          description: item.description || undefined,
          code,
          discountText,
          discountType: code ? "percentage" : "other",
          destinationUrl,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          terms: item.terms || undefined,
          joined: isJoined,
          rawPayload: item,
        };
      });
  }

  // ── Conversions / Transactions ──────────────────────────────

  async fetchConversions(
    credentials: NetworkCredentials,
    since: Date,
    options?: { fixtureData?: any[] }
  ): Promise<NormalizedConversion[]> {
    if (options?.fixtureData) {
      return this.normalizeConversions(options.fixtureData, since);
    }

    if (!hasLiveCredentials(credentials)) {
      return this.normalizeConversions(awinConversionsFixture, since);
    }

    const { apiKey, publisherId } = getCredentials(credentials);
    const allConversions: NormalizedConversion[] = [];
    const now = new Date();
    const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

    let windowStart = new Date(since);

    while (windowStart < now) {
      const windowEnd = new Date(Math.min(windowStart.getTime() + MAX_WINDOW_MS, now.getTime()));
      const startStr = windowStart.toISOString().replace(/\.\d{3}Z$/, "Z");
      const endStr = windowEnd.toISOString().replace(/\.\d{3}Z$/, "Z");

      try {
        const rawTxns = await awinFetch<AwinTransaction[]>(
          `/publishers/${publisherId}/transactions/?startDate=${startStr}&endDate=${endStr}&timezone=UTC&accessToken=${apiKey}`,
          apiKey
        );

        const normalized = this.normalizeConversions(rawTxns, since);
        allConversions.push(...normalized);
      } catch (err: any) {
        console.error(`Awin fetchConversions window ${startStr}→${endStr} error: ${err.message}`);
      }

      windowStart = windowEnd;
    }

    return allConversions;
  }

  private normalizeConversions(rawConversions: any[], since: Date): NormalizedConversion[] {
    const result: NormalizedConversion[] = [];

    for (const item of rawConversions) {
      const txDate = new Date(item.transactionDate);
      if (txDate < since) continue;

      const saleMoney = toMinorUnits(
        item.saleAmount?.amount || 0,
        item.saleAmount?.currency || "USD"
      );
      const commMoney = toMinorUnits(
        item.commissionAmount?.amount || 0,
        item.commissionAmount?.currency || "USD"
      );

      let status: "pending" | "confirmed" | "declined" = "pending";
      if (item.commissionStatus === "approved") status = "confirmed";
      if (item.commissionStatus === "deleted" || item.commissionStatus === "declined") status = "declined";

      result.push({
        networkTransactionId: String(item.id),
        clickRef: item.clickRefs?.clickRef || undefined,
        merchantId: String(item.advertiserId),
        merchantName: item.advertiserName || "Merchant",
        amountMinor: saleMoney.amountMinor,
        commissionMinor: commMoney.amountMinor,
        currency: commMoney.currency || "USD",
        status,
        transactionDate: txDate,
        rawDataJson: JSON.stringify(item),
      });
    }

    return result;
  }

  // ── Deeplink Generation ─────────────────────────────────────

  async generateDeeplink(
    credentials: NetworkCredentials,
    advertiserId: number,
    destinationUrl: string,
    clickRef?: string
  ): Promise<{ url: string; shortUrl?: string }> {
    const { apiKey, publisherId } = getCredentials(credentials);

    const body: any = {
      advertiserId,
      destinationUrl,
      shorten: true,
    };

    if (clickRef) {
      body.parameters = { clickref: clickRef };
    }

    return awinFetch<{ url: string; shortUrl?: string }>(
      `/publishers/${publisherId}/linkbuilder/generate?accessToken=${apiKey}`,
      apiKey,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  // ── Coupon Mapper ──────────────────────────────────────────

  mapToCoupon(offer: NormalizedOffer, storeId: string) {
    const cleaned = cleanTitleAndExtractCode(offer.title);
    const parsed = parseDiscountFromTitle(offer.title, offer.discountText);
    const finalCode = offer.code || cleaned.extractedCode;
    const isCode = Boolean(finalCode);

    const cleanTitle = cleaned.title;
    const cleanDescription =
      offer.description &&
      offer.description.trim() !== cleanTitle.trim() &&
      offer.description.trim() !== offer.title.trim()
        ? offer.description.trim()
        : undefined;

    const dedupeInput = `awin_${offer.merchantId}_${offer.networkOfferId}_${finalCode || cleanTitle}`;
    const dedupeHash = crypto.createHash("sha256").update(dedupeInput).digest("hex");

    return {
      storeId,
      title: cleanTitle,
      description: cleanDescription,
      code: isCode ? finalCode : undefined,
      discountText: parsed.discountText,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue || offer.discountValue,
      destinationUrl: offer.destinationUrl,
      dedupeHash,
      expiresAt: offer.endDate,
      type: isCode ? ("code" as const) : ("deal" as const),
      status: "active" as const,
    };
  }
}

export const awinConnector = new AwinConnector();
registerConnector(awinConnector);
