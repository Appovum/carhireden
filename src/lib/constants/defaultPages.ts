// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Default Canonical Page Settings & Content
// Used as fallback across Admin Page Management & Public Legal/Info Pages
// ═══════════════════════════════════════════════════════════════════

export interface PageSettings {
  title: string;
  subtitle: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const DEFAULT_PAGES: Record<string, PageSettings> = {
  about: {
    title: "About CouponPilot",
    subtitle: "Empowering shoppers with verified coupons, exclusive deals, and cash back rewards.",
    content: `## Who We Are

CouponPilot is a modern money-saving platform dedicated to finding, verifying, and curating the best online coupons, promo codes, and cash back offers. We test hundreds of discount codes daily to ensure you never encounter an expired code at checkout.

## Our Mission

Our mission is to make online shopping simpler and more rewarding. We believe shopping online should always come with savings, which is why we partner directly with thousands of merchants and top affiliate networks to bring you verified savings and clear cash back rates.

## How CouponPilot Works

1. **Browse & Search**: Find your favorite stores or categories using our curated directory.
2. **Copy Code or Activate Deal**: Click to reveal exclusive promo codes or activate instant deals.
3. **Earn Cash Back**: When you shop through CouponPilot links, we share our merchant commissions back with you as cash back!

## Verified Guarantee

Every coupon listed on CouponPilot undergoes continuous automated and manual verification. If a code fails, our community upvotes and downvotes ensure only working deals stay at the top.`,
    metaTitle: "About Us — CouponPilot",
    metaDescription: "Learn about CouponPilot, our mission, verified coupon codes, and cash back rewards.",
  },
  contact: {
    title: "Contact Us",
    subtitle: "Have a question, feedback, or need help with cashback? We're here to assist you.",
    email: "support@couponpilot.com",
    phone: "+1 (800) 555-7456",
    address: "100 Innovation Way, Suite 400, San Francisco, CA 94105",
    content: "Our support team typically responds within 24 business hours. Fill out the contact form below or reach us directly at our support email.",
    metaTitle: "Contact Support — CouponPilot",
    metaDescription: "Get in touch with the CouponPilot team for inquiries, missing cashback, or merchant partnerships.",
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Effective Date: August 1, 2026",
    content: `## 1. Information We Collect

CouponPilot collects information to provide better services to all of our users. This includes:
- **Account Data**: When you sign up, we store your email address, name, and encrypted security tokens.
- **Usage & Click Data**: When you click outbound store links, we record click logs (IP hash, referral link, and affiliate SubID) to ensure cash back tracking and prevent fraud.
- **Cookies**: We use cookies to preserve session state and attribute cashback conversions.

## 2. How We Use Information

We use the data we collect to:
- Verify and attribute cashback transactions to your account balance.
- Process withdrawal payout requests securely.
- Improve site performance, detect security threats, and prevent bot abuse.

## 3. Data Sharing & Third Parties

We never sell your personal data. We share anonymized click IDs with affiliate networks (such as Awin, CJ, Impact) solely for conversion verification and payout settlement.

## 4. Your Data Rights

You have the right to request access to, update, or delete your account data at any time by contacting support or managing your account settings.`,
    metaTitle: "Privacy Policy — CouponPilot",
    metaDescription: "Read the CouponPilot privacy policy to understand how your data and cookies are handled.",
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Effective Date: August 1, 2026",
    content: `## 1. Acceptance of Terms

By accessing or using CouponPilot, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.

## 2. Affiliate Links & Cash Back Eligibility

- Outbound links on CouponPilot may contain affiliate tracking.
- Cash back rewards are contingent upon merchant approval and valid conversion tracking.
- Purchases completed using third-party coupon codes not listed on CouponPilot may invalidate cashback.

## 3. Account Security & User Conduct

Users are responsible for maintaining the security of their account credentials. Automated scripts, scrapers, or fraudulent multi-account creation are strictly prohibited.

## 4. Limitation of Liability

CouponPilot provides discount codes and merchant information "as is". Store pricing, stock availability, and merchant promotional terms are subject to change without notice.`,
    metaTitle: "Terms of Service — CouponPilot",
    metaDescription: "CouponPilot Terms of Service, user agreement, and cashback rules.",
  },
};

export function getDefaultPage(key: string): PageSettings {
  return DEFAULT_PAGES[key] || {
    title: "",
    subtitle: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
  };
}
