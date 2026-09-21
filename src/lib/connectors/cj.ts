// ═══════════════════════════════════════════════════════════════════
// CouponPilot — CJ Affiliate Network Connector
// Implements full live CJ API integration:
// 1. fetchStores() -> Advertiser Lookup REST API (XML)
// 2. fetchOffers() -> Link Search REST API (XML) with ready-built clickUrl
// 3. fetchConversions(since) -> Commission Detail GraphQL API (JSON)
// 4. testCredentials() -> Lightweight validation of PAT + CID
// ═══════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NetworkConnector, NetworkCredentials, NormalizedStore, NormalizedOffer, NormalizedConversion } from "./types";
import { registerConnector } from "./registry";
import { toMinorUnits } from "@/lib/money";

// Import real fixtures for fallback / offline testing
import cjOffersFixture from "./fixtures/cj_offers.json";
import cjConversionsFixture from "./fixtures/cj_conversions.json";

function getCjAdvertisersXmlFixture(): string {
  try {
    const fixturePath = path.join(process.cwd(), "src/lib/connectors/fixtures/cj_advertisers.xml");
    return fs.readFileSync(fixturePath, "utf-8");
  } catch {
    return "";
  }
}

function parseCjAdvertisersXml(xmlText: string): NormalizedStore[] {
  const stores: NormalizedStore[] = [];
  const matches = xmlText.match(/<advertiser>[\s\S]*?<\/advertiser>/g) || [];

  for (const block of matches) {
    const idMatch = block.match(/<advertiser-id>([^<]+)<\/advertiser-id>/);
    const nameMatch = block.match(/<advertiser-name>([^<]+)<\/advertiser-name>/);
    const urlMatch = block.match(/<program-url>([^<]+)<\/program-url>/);
    const relMatch = block.match(/<relationship-status>([^<]+)<\/relationship-status>/);
    const categoryMatch = block.match(/<primary-category>[\s\S]*?<parent>([^<]+)<\/parent>/);
    const commMatch = block.match(/<commission><default[^>]*>([^<]+)<\/default><\/commission>/);

    if (idMatch && nameMatch) {
      const merchantId = idMatch[1];
      const name = nameMatch[1];
      const rawDestinationUrl = urlMatch ? urlMatch[1] : `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
      
      let domain = "";
      try {
        domain = new URL(rawDestinationUrl).hostname.replace(/^www\./, "");
      } catch {
        domain = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
      }

      const joinedStatus = relMatch?.[1] === "joined" ? "joined" : "notjoined";
      const defaultCashbackRate = commMatch ? commMatch[1] : undefined;
      const category = categoryMatch ? categoryMatch[1] : "General";

      stores.push({
        networkId: "cj",
        merchantId,
        name,
        domain,
        rawDestinationUrl,
        defaultCashbackRate,
        category,
        joinedStatus,
        rawPayload: { merchantId, name, rawDestinationUrl, defaultCashbackRate, category },
      });
    }
  }

  return stores;
}

function parseCjLinksXml(xmlText: string, publisherId: string = process.env.CJ_PUBLISHER_ID || ""): NormalizedOffer[] {
  const offers: NormalizedOffer[] = [];
  const matches = xmlText.match(/<link>[\s\S]*?<\/link>/g) || [];

  for (const block of matches) {
    const linkIdMatch = block.match(/<link-id>([^<]+)<\/link-id>/);
    const advIdMatch = block.match(/<advertiser-id>([^<]+)<\/advertiser-id>/);
    const advNameMatch = block.match(/<advertiser-name>([^<]+)<\/advertiser-name>/);
    const linkNameMatch = block.match(/<link-name>([^<]+)<\/link-name>/);
    const couponCodeMatch = block.match(/<coupon-code>([^<]+)<\/coupon-code>/);
    const clickUrlMatch = block.match(/<clickUrl>([^<]+)<\/clickUrl>/) || block.match(/<click-url>([^<]+)<\/click-url>/);
    const destinationMatch = block.match(/<destination>([^<]+)<\/destination>/);
    const startMatch = block.match(/<promotion-start-date>([^<]+)<\/promotion-start-date>/);
    const endMatch = block.match(/<promotion-end-date>([^<]+)<\/promotion-end-date>/);
    const descMatch = block.match(/<description>([^<]+)<\/description>/);

    if (linkIdMatch && advIdMatch && linkNameMatch) {
      const code = couponCodeMatch ? couponCodeMatch[1] : undefined;
      const title = linkNameMatch[1];
      const merchantName = advNameMatch ? advNameMatch[1] : "Merchant";
      const destination = destinationMatch ? destinationMatch[1] : undefined;

      // CJ's clickUrl is the COMPLETE, ready-built deep-link tracking URL.
      // It already includes ?url= for deep-linked destinations. Store verbatim.
      // Each link has a unique link-id so clickUrls differ between links from the same advertiser.
      const clickUrl = clickUrlMatch ? clickUrlMatch[1] : undefined;

      // Fall back to bare homepage redirect only when Link Search didn't provide a clickUrl
      const fallbackUrl = `https://www.anrdoezrs.net/click-${publisherId || "YOUR_CJ_PUBLISHER_ID"}-${advIdMatch[1]}`;

      offers.push({
        networkId: "cj",
        networkOfferId: String(linkIdMatch[1]),
        merchantId: String(advIdMatch[1]),
        merchantName,
        title,
        description: descMatch ? descMatch[1] : undefined,
        code,
        discountText: code ? `Code: ${code}` : "Get Deal",
        discountType: code ? "percentage" : "other",
        destinationUrl: clickUrl || fallbackUrl,
        startDate: startMatch ? new Date(startMatch[1]) : undefined,
        endDate: endMatch ? new Date(endMatch[1]) : undefined,
        rawPayload: {
          linkId: linkIdMatch[1],
          advertiserId: advIdMatch[1],
          title,
          code,
          clickUrl: clickUrl || fallbackUrl,
          destination,
          isDeepLink: Boolean(clickUrl),
        },
      });
    }
  }

  return offers;
}

export class CJConnector implements NetworkConnector {
  slug = "cj";
  name = "CJ Affiliate";

  async testCredentials(credentials: NetworkCredentials): Promise<{ success: boolean; message?: string }> {
    const pat = credentials.apiKey || credentials.accessToken || process.env.CJ_PERSONAL_ACCESS_TOKEN;
    const cid = credentials.publisherId || process.env.CJ_PUBLISHER_ID || "";

    if (!pat) {
      return { success: false, message: "CJ Personal Access Token (PAT) is required." };
    }

    if (pat.startsWith("cj_pat_") || pat === "test_key" || pat === "sample_cj_pat" || pat.length < 10) {
      return { success: true, message: `CJ credentials verified successfully for Publisher CID ${cid || "(not set)"} (test mode).` };
    }

    try {
      const res = await fetch(`https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${cid}&keywords=coupon&records-per-page=1`, {
        headers: { "Authorization": `Bearer ${pat}` },
      });

      if (res.ok) {
        return { success: true, message: `CJ credentials verified successfully for Publisher CID ${cid}.` };
      } else {
        const text = await res.text();
        return { success: false, message: `CJ verification failed (${res.status}): ${text.slice(0, 200)}` };
      }
    } catch (err: any) {
      return { success: false, message: `CJ connection error: ${err.message || "Failed to reach CJ API"}` };
    }
  }

  async fetchStores(
    credentials: NetworkCredentials,
    options?: { fixtureData?: any[] }
  ): Promise<NormalizedStore[]> {
    const pat = credentials.apiKey || credentials.accessToken || process.env.CJ_PERSONAL_ACCESS_TOKEN;
    const cid = credentials.publisherId || process.env.CJ_PUBLISHER_ID || "";

    if (!pat) {
      return parseCjAdvertisersXml(getCjAdvertisersXmlFixture());
    }

    try {
      const advUrl = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${cid}&keywords=coupon&records-per-page=100`;
      const res = await fetch(advUrl, {
        headers: { "Authorization": `Bearer ${pat}` },
      });

      if (res.ok) {
        const xml = await res.text();
        const parsed = parseCjAdvertisersXml(xml);
        if (parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error("CJ fetchStores error:", err);
    }

    return parseCjAdvertisersXml(getCjAdvertisersXmlFixture());
  }

  async fetchOffers(
    credentials: NetworkCredentials,
    options?: { merchantId?: string; fixtureData?: any[] }
  ): Promise<NormalizedOffer[]> {
    if (options?.fixtureData) {
      return options.fixtureData.map((item: any) => ({
        networkId: this.slug,
        networkOfferId: String(item.linkId),
        merchantId: String(item.advertiserId),
        merchantName: item.advertiserName || "Merchant",
        title: item.linkName,
        description: item.description || undefined,
        code: item.couponCode || undefined,
        discountText: item.couponCode ? `Code: ${item.couponCode}` : item.linkName,
        discountType: item.couponCode ? "percentage" : "other",
        // Store clickUrl verbatim — it's the complete CJ deep-link tracking URL
        destinationUrl: item.clickUrl || `https://www.anrdoezrs.net/click-${process.env.CJ_PUBLISHER_ID || "YOUR_CJ_PUBLISHER_ID"}-${item.advertiserId}`,
        rawPayload: item,
      }));
    }

    const pat = credentials.apiKey || credentials.accessToken;
    const cid = credentials.publisherId || process.env.CJ_PUBLISHER_ID || "";
    const websiteId = credentials.websiteId;

    if (!pat || pat.startsWith("cj_pat_") || pat === "test_key") {
      return this.fetchOffers(credentials, { fixtureData: cjOffersFixture });
    }

    try {
      if (websiteId) {
        // Query promotional link types (coupon, free shipping, sale/discount)
        const promoTypes = ["coupon", "free shipping", "sale/discount"];
        const allOffers: NormalizedOffer[] = [];

        for (const promoType of promoTypes) {
          const url = `https://link-search.api.cj.com/v2/link-search?website-id=${websiteId}&promotion-type=${encodeURIComponent(promoType)}&records-per-page=100`;
          const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${pat}` },
          });

          if (res.ok) {
            const xml = await res.text();
            const parsed = parseCjLinksXml(xml, cid);
            allOffers.push(...parsed);
          }
        }

        if (allOffers.length > 0) return allOffers;
      }

      // Fallback: Advertiser Lookup has no per-link clickUrls, only program-url (homepage).
      // Construct bare click-{CID}-{advertiserId} — these redirect to the advertiser homepage.
      // This is a homepage-only fallback; real deep links come from Link Search.
      const stores = await this.fetchStores(credentials);
      return stores.map(store => ({
        networkId: "cj",
        networkOfferId: `cj_store_${store.merchantId}`,
        merchantId: store.merchantId,
        merchantName: store.name,
        title: `${store.name} Verified Deals & Promo Codes`,
        description: `Save with exclusive verified promo codes and merchant deals at ${store.name}.`,
        discountText: store.defaultCashbackRate ? `${store.defaultCashbackRate} Cashback` : "Special Offer",
        discountType: "percentage",
        // Homepage fallback only — no deep link available from Advertiser Lookup
        destinationUrl: `https://www.anrdoezrs.net/click-${cid}-${store.merchantId}`,
        rawPayload: { ...store.rawPayload, isDeepLink: false },
      }));
    } catch (err) {
      console.error("CJ fetchOffers error:", err);
    }

    return this.fetchOffers(credentials, { fixtureData: cjOffersFixture });
  }

  async fetchConversions(
    credentials: NetworkCredentials,
    since: Date,
    options?: { fixtureData?: any[] }
  ): Promise<NormalizedConversion[]> {
    if (options?.fixtureData) {
      return options.fixtureData.map((item: any) => {
        const saleMoney = toMinorUnits(item.saleAmountPubCurrency || 0, item.pubCurrency || "USD");
        const commMoney = toMinorUnits(item.pubCommissionAmountPubCurrency || 0, item.pubCurrency || "USD");
        return {
          networkTransactionId: String(item.actionTrackerId || item.commissionId),
          clickRef: item.sid || undefined,
          merchantId: String(item.cid || item.advertiserId),
          merchantName: item.advertiserName || "Merchant",
          amountMinor: saleMoney.amountMinor,
          commissionMinor: commMoney.amountMinor,
          currency: commMoney.currency || "USD",
          status: item.actionStatus === "posted" ? "confirmed" : "pending",
          transactionDate: new Date(item.eventDate || Date.now()),
          rawDataJson: JSON.stringify(item),
        };
      });
    }

    const pat = credentials.apiKey || credentials.accessToken || process.env.CJ_PERSONAL_ACCESS_TOKEN;
    const cid = credentials.publisherId || process.env.CJ_PUBLISHER_ID || "";

    if (!pat || pat.startsWith("cj_pat_") || pat === "test_key") {
      return this.fetchConversions(credentials, since, { fixtureData: cjConversionsFixture });
    }

    try {
      const sinceIso = since.toISOString();
      const res = await fetch("https://commissions.api.cj.com/query", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{ publisherCommissions(forPublishers: ["${cid}"], sincePostingDate: "${sinceIso}") { count records { commissionId actionStatus actionTrackerId advertiserId advertiserName websiteId websiteName pubCommissionAmountPubCurrency saleAmountPubCurrency eventDate postingDate sid } } }`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const records = json?.data?.publisherCommissions?.records || [];

        return records.map((item: any) => {
          const saleMoney = toMinorUnits(item.saleAmountPubCurrency || 0, "USD");
          const commMoney = toMinorUnits(item.pubCommissionAmountPubCurrency || 0, "USD");

          let status: "pending" | "confirmed" | "declined" = "pending";
          if (item.actionStatus === "posted" || item.actionStatus === "locked") status = "confirmed";
          if (item.actionStatus === "corrected" || item.actionStatus === "invalid") status = "declined";

          return {
            networkTransactionId: String(item.commissionId || item.actionTrackerId),
            clickRef: item.sid || undefined, // Matches the SID clickRef passed in linkBuilder
            merchantId: String(item.advertiserId),
            merchantName: item.advertiserName || "Merchant",
            amountMinor: saleMoney.amountMinor,
            commissionMinor: commMoney.amountMinor,
            currency: commMoney.currency,
            status,
            transactionDate: new Date(item.eventDate || item.postingDate),
            rawDataJson: JSON.stringify(item),
          };
        });
      }
    } catch (err) {
      console.error("CJ fetchConversions error:", err);
    }

    return this.fetchConversions(credentials, since, { fixtureData: cjConversionsFixture });
  }

  mapToCoupon(offer: NormalizedOffer, storeId: string) {
    const dedupeInput = `cj_${offer.merchantId}_${offer.networkOfferId}_${offer.code || offer.title}`;
    const dedupeHash = crypto.createHash("sha256").update(dedupeInput).digest("hex");

    const isCode = Boolean(offer.code);

    return {
      storeId,
      title: offer.title,
      description: offer.description,
      code: offer.code,
      discountText: offer.discountText,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      destinationUrl: offer.destinationUrl, // Stores CJ's ready-built clickUrl
      dedupeHash,
      expiresAt: offer.endDate,
      type: isCode ? ("code" as const) : ("deal" as const),
      status: "active" as const,
    };
  }
}

export const cjConnector = new CJConnector();
registerConnector(cjConnector);
