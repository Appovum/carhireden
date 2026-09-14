// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Core types
// ═══════════════════════════════════════════════════════════════════

export type CouponType = "code" | "deal" | "cashback";

export type CouponStatus = "active" | "expiring" | "expired";

export interface Coupon {
  id: string;
  storeId?: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  type: CouponType;
  status: CouponStatus;
  code?: string; // only for type === "code"
  title: string;
  description?: string;
  discountText: string; // e.g. "60% OFF", "$25 OFF", "Free shipping"
  discountValue?: number; // numeric for sorting
  merchantUrl: string;
  successRate: number; // 0–100
  usedToday: number;
  verifiedAt: string; // ISO date
  expiresAt?: string; // ISO date, optional for evergreen deals
  cashbackRate?: string; // e.g. "8% cashback" — only for cashback type
  isExclusive?: boolean;
  isFeatured?: boolean;
}

export interface Store {
  slug: string;
  name: string;
  logo: string;
  domain: string;
  cashbackRate?: string;
  successRate: number;
  totalCoupons: number;
  categories: string[];
  isFeatured?: boolean;
}

export interface CashbackTransaction {
  id: string;
  storeName: string;
  storeLogo: string;
  amount: number;
  status: "pending" | "confirmed" | "paid";
  purchaseDate: string;
  estimatedConfirmation?: string;
  confirmedDate?: string;
  paidDate?: string;
}

export interface WalletBalance {
  pending: number;
  confirmed: number;
  paid: number;
  total: number;
}

export interface SearchResult {
  type: "store" | "category" | "coupon";
  label: string;
  slug: string;
  subtitle?: string;
  logo?: string;
  domain?: string;
}
