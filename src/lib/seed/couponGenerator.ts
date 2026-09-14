// ═══════════════════════════════════════════════════════════════════
// CouponPilot — 10,000 Coupons & Deals High-Yield Generator
// Generates realistic promo codes, deals, & cashback offers per store.
// ═══════════════════════════════════════════════════════════════════

export interface GeneratedCoupon {
  storeSlug: string;
  title: string;
  code: string | null;
  discountText: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping" | "bogo" | "cashback";
  discountValue: number;
  destinationUrl: string;
  dedupeHash: string;
  type: "code" | "deal" | "cashback";
  status: "active";
  terms?: string;
  usedCount: number;
  usedTodayCount: number;
  verifiedAt: Date;
  expiresAt: Date;
}

const COMMON_PROMO_PREFIXES = [
  "SAVE", "GET", "WELCOME", "SUMMER", "SPRING", "FALL", "WINTER",
  "SPECIAL", "EXTRA", "VIP", "DEAL", "EXCLUSIVE", "CYBER", "FLASH",
  "PROMO", "SUPER", "BONUS", "MEGA", "HOT", "LUCKY"
];

const CODE_NUMBER_SUFFIXES = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75, 80, 100, 2026];

const TEMPLATES_BY_CATEGORY: Record<string, Array<{ title: string; discountText: string; type: "code" | "deal" | "cashback"; discountType: "percentage" | "fixed_amount" | "free_shipping" | "bogo" | "cashback"; discountValue: number }>> = {
  fashion: [
    { title: "20% OFF Site Wide + Free Shipping on Orders $50+", discountText: "20% OFF", type: "code", discountType: "percentage", discountValue: 20 },
    { title: "Extra $15 OFF Your First Apparel Purchase", discountText: "$15 OFF", type: "code", discountType: "fixed_amount", discountValue: 15 },
    { title: "Up to 50% OFF Clearance & Outlet Styles", discountText: "50% OFF", type: "deal", discountType: "percentage", discountValue: 50 },
    { title: "Free Express Shipping on Orders Over $75", discountText: "FREE SHIPPING", type: "deal", discountType: "free_shipping", discountValue: 0 },
    { title: "Buy 1 Get 1 50% OFF Select Footwear & Accessories", discountText: "BOGO 50%", type: "deal", discountType: "bogo", discountValue: 50 },
    { title: "Exclusive 30% OFF Student Discount Verification", discountText: "30% OFF", type: "code", discountType: "percentage", discountValue: 30 },
    { title: "$25 OFF $100+ Minimum Spend Promo Code", discountText: "$25 OFF", type: "code", discountType: "fixed_amount", discountValue: 25 },
    { title: "10% Cashback Bonus on All Fashion Collections", discountText: "10% Cashback", type: "cashback", discountType: "cashback", discountValue: 10 },
  ],
  electronics: [
    { title: "$100 OFF Premium Laptops & Tech Gadgets", discountText: "$100 OFF", type: "code", discountType: "fixed_amount", discountValue: 100 },
    { title: "15% OFF Wireless Audio & Headphones Accessories", discountText: "15% OFF", type: "code", discountType: "percentage", discountValue: 15 },
    { title: "Up to 40% OFF Refurbished & Open-Box Tech Deals", discountText: "40% OFF", type: "deal", discountType: "percentage", discountValue: 40 },
    { title: "Free Next-Day Delivery on Orders Above $99", discountText: "FREE SHIPPING", type: "deal", discountType: "free_shipping", discountValue: 0 },
    { title: "$50 Instant Trade-In Credit Coupon", discountText: "$50 OFF", type: "code", discountType: "fixed_amount", discountValue: 50 },
    { title: "Save 25% OFF Smart Home Devices & Accessories", discountText: "25% OFF", type: "code", discountType: "percentage", discountValue: 25 },
    { title: "5% Cashback Upgrade on High-Tech Purchasing", discountText: "5% Cashback", type: "cashback", discountType: "cashback", discountValue: 5 },
  ],
  software: [
    { title: "75% OFF Annual Unlimited Web Hosting Plans", discountText: "75% OFF", type: "code", discountType: "percentage", discountValue: 75 },
    { title: "Save 68% + 3 Months Free VPN Subscription", discountText: "68% OFF", type: "code", discountType: "percentage", discountValue: 68 },
    { title: "Extra $30 OFF Pro Developer & Design Tools", discountText: "$30 OFF", type: "code", discountType: "fixed_amount", discountValue: 30 },
    { title: "Free 14-Day Full Access Premium Trial", discountText: "FREE TRIAL", type: "deal", discountType: "percentage", discountValue: 100 },
    { title: "20% Cashback Bonus on Cloud Software Renewals", discountText: "20% Cashback", type: "cashback", discountType: "cashback", discountValue: 20 },
  ],
  travel: [
    { title: "Save $50 OFF Flight + Hotel Vacation Bundles", discountText: "$50 OFF", type: "code", discountType: "fixed_amount", discountValue: 50 },
    { title: "Up to 30% OFF Early Bird Hotel Reservations", discountText: "30% OFF", type: "deal", discountType: "percentage", discountValue: 30 },
    { title: "15% OFF Rental Car Booking Coupon Code", discountText: "15% OFF", type: "code", discountType: "percentage", discountValue: 15 },
    { title: "Free Room Upgrade on 3+ Night Stays", discountText: "FREE UPGRADE", type: "deal", discountType: "percentage", discountValue: 0 },
    { title: "8% Cashback Refund on International Bookings", discountText: "8% Cashback", type: "cashback", discountType: "cashback", discountValue: 8 },
  ],
  beauty: [
    { title: "20% OFF Skincare & Makeup Bestsellers", discountText: "20% OFF", type: "code", discountType: "percentage", discountValue: 20 },
    { title: "Free 5-Piece Deluxe Beauty Sample Kit with $60 Order", discountText: "FREE GIFT", type: "deal", discountType: "percentage", discountValue: 0 },
    { title: "$10 OFF Orders Over $50 Beauty Discount Code", discountText: "$10 OFF", type: "code", discountType: "fixed_amount", discountValue: 10 },
    { title: "Buy 2 Get 1 FREE Lip & Eye Care Favorites", discountText: "BUY 2 GET 1", type: "deal", discountType: "bogo", discountValue: 100 },
  ],
  home: [
    { title: "15% OFF Modern Furniture & Living Room Decor", discountText: "15% OFF", type: "code", discountType: "percentage", discountValue: 15 },
    { title: "$100 OFF Mattress & Bedding Sleep Sets", discountText: "$100 OFF", type: "code", discountType: "fixed_amount", discountValue: 100 },
    { title: "Up to 60% OFF Seasonal Home Clearance Event", discountText: "60% OFF", type: "deal", discountType: "percentage", discountValue: 60 },
    { title: "Free Freight Home Delivery on Furniture $299+", discountText: "FREE SHIPPING", type: "deal", discountType: "free_shipping", discountValue: 0 },
  ],
  food: [
    { title: "60% OFF Your First 3 Meal Delivery Boxes", discountText: "60% OFF", type: "code", discountType: "percentage", discountValue: 60 },
    { title: "$20 OFF First Dining & Restaurant Order", discountText: "$20 OFF", type: "code", discountType: "fixed_amount", discountValue: 20 },
    { title: "Free Zero Delivery Fee Code for Existing Users", discountText: "FREE DELIVERY", type: "code", discountType: "free_shipping", discountValue: 0 },
  ],
  education: [
    { title: "85% OFF Online Certification Courses & Bootcamps", discountText: "85% OFF", type: "code", discountType: "percentage", discountValue: 85 },
    { title: "7-Day Free Unlimited Learning Membership Access", discountText: "FREE TRIAL", type: "deal", discountType: "percentage", discountValue: 100 },
    { title: "$50 OFF Annual Learning Subscription Pass", discountText: "$50 OFF", type: "code", discountType: "fixed_amount", discountValue: 50 },
  ],
  marketplaces: [
    { title: "$15 OFF $75+ Sitewide Order Promo Code", discountText: "$15 OFF", type: "code", discountType: "fixed_amount", discountValue: 15 },
    { title: "Up to 70% OFF Daily Flash Super Deals", discountText: "70% OFF", type: "deal", discountType: "percentage", discountValue: 70 },
    { title: "Free 2-Day Express Shipping Membership Deal", discountText: "FREE SHIPPING", type: "deal", discountType: "free_shipping", discountValue: 0 },
  ],
  health: [
    { title: "25% OFF Protein & Wellness Supplements", discountText: "25% OFF", type: "code", discountType: "percentage", discountValue: 25 },
    { title: "$15 OFF $60+ Vitamin & Mineral Orders", discountText: "$15 OFF", type: "code", discountType: "fixed_amount", discountValue: 15 },
    { title: "Buy 1 Get 1 50% OFF Muscle Building Formulas", discountText: "BOGO 50%", type: "deal", discountType: "bogo", discountValue: 50 },
  ]
};

/**
 * Generates target number of coupons (e.g. 10,000) evenly distributed among the 200 stores.
 */
export function generateShowcaseCoupons(
  stores: Array<{ slug: string; domain: string; categorySlug: string }>,
  targetCount = 10000
): GeneratedCoupon[] {
  const couponsPerStore = Math.ceil(targetCount / stores.length);
  const result: GeneratedCoupon[] = [];
  const now = new Date();

  let globalIndex = 0;

  for (const store of stores) {
    const templates = TEMPLATES_BY_CATEGORY[store.categorySlug] || TEMPLATES_BY_CATEGORY["fashion"];

    for (let i = 0; i < couponsPerStore; i++) {
      globalIndex++;
      if (result.length >= targetCount) break;

      const template = templates[i % templates.length];

      // Force 85% of all generated offers to have explicit copyable coupon codes
      const isCodeOffer = (i % 6) !== 5; // 5 out of 6 items are explicit codes
      const offerType: "code" | "deal" | "cashback" = isCodeOffer
        ? "code"
        : (i % 2 === 0 ? "deal" : "cashback");

      const prefix = COMMON_PROMO_PREFIXES[(globalIndex + i) % COMMON_PROMO_PREFIXES.length];
      const suffix = CODE_NUMBER_SUFFIXES[(globalIndex + i) % CODE_NUMBER_SUFFIXES.length];
      
      // Store specific code prefix (e.g. NIKE20, NORD25, SEPHORA10)
      const storeCodePrefix = store.slug.replace(/[^a-z0-9]/gi, "").substring(0, 5).toUpperCase();
      const generatedCode = offerType === "code"
        ? (i % 2 === 0 ? `${storeCodePrefix}${suffix}` : `${prefix}${suffix}`)
        : null;

      // Calculate staggered expiration (30 to 365 days ahead)
      const daysAhead = 30 + ((globalIndex * 7 + i * 13) % 335);
      const expiresAt = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      // Usage stats
      const usedCount = 45 + ((globalIndex * 19 + i * 29) % 2400);
      const usedTodayCount = 4 + ((globalIndex * 3 + i * 7) % 85);

      const formattedStoreName = store.slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      result.push({
        storeSlug: store.slug,
        title: `${formattedStoreName} — ${template.title}`,
        code: generatedCode,
        discountText: template.discountText,
        discountType: template.discountType,
        discountValue: template.discountValue,
        destinationUrl: `https://${store.domain}`,
        dedupeHash: `showcase_${store.slug}_${i + 1}_${generatedCode || 'deal'}`,
        type: offerType,
        status: "active",
        terms: `Valid on eligible purchases at ${store.domain}. Cannot be combined with other promotional offers. One redemption per customer account.`,
        usedCount,
        usedTodayCount,
        verifiedAt: new Date(now.getTime() - ((i * 3) % 24) * 60 * 60 * 1000),
        expiresAt,
      });
    }
  }

  return result;
}
