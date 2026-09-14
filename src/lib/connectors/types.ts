// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Affiliate Network Connector Types
// ═══════════════════════════════════════════════════════════════════

export interface NetworkCredentials {
  apiKey?: string;
  apiSecret?: string;
  affiliateId?: string;
  publisherId?: string;
  accessToken?: string;
  websiteId?: string;
  [key: string]: any;
}

export interface NormalizedStore {
  networkId: string;
  merchantId: string;
  name: string;
  domain: string;
  rawDestinationUrl: string;
  defaultCashbackRate?: string;
  category?: string;
  joinedStatus?: "joined" | "notjoined" | "pending";
  logoUrl?: string;
  rawPayload?: Record<string, any>;
}

export interface NormalizedOffer {
  networkId: string;
  networkOfferId: string;
  merchantId: string;
  merchantName: string;
  title: string;
  description?: string;
  code?: string;
  discountText: string;
  discountType?: "percentage" | "fixed" | "free_shipping" | "other";
  discountValue?: number;
  destinationUrl: string;
  startDate?: Date;
  endDate?: Date;
  terms?: string;
  joined?: boolean;
  rawPayload?: Record<string, any>;
}

export interface NormalizedConversion {
  networkTransactionId: string;
  clickRef?: string; // SubID / Click ID
  merchantId: string;
  merchantName: string;
  amountMinor: number; // Minor units (e.g. cents)
  commissionMinor: number; // Minor units
  currency: string;
  status: "pending" | "confirmed" | "declined";
  transactionDate: Date;
  confirmedDate?: Date;
  rawDataJson?: string;
}

export interface NetworkConnector {
  slug: string;
  name: string;
  testCredentials(credentials: NetworkCredentials): Promise<{ success: boolean; message?: string }>;
  fetchStores?(credentials: NetworkCredentials, options?: { fixtureData?: any[] }): Promise<NormalizedStore[]>;
  fetchOffers(credentials: NetworkCredentials, options?: { merchantId?: string; fixtureData?: any[] }): Promise<NormalizedOffer[]>;
  fetchConversions(credentials: NetworkCredentials, since: Date, options?: { fixtureData?: any[] }): Promise<NormalizedConversion[]>;
  mapToCoupon(offer: NormalizedOffer, storeId: string): {
    storeId: string;
    title: string;
    description?: string;
    code?: string;
    discountText: string;
    discountType?: string;
    discountValue?: number;
    destinationUrl: string;
    dedupeHash: string;
    expiresAt?: Date;
    type: "code" | "deal" | "cashback";
    status: "active" | "expiring" | "expired" | "draft";
  };
}
