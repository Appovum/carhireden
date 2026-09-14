// ═══════════════════════════════════════════════════════════════════
// CouponPilot — JSON-LD Schema Generator
// Produces Google-compliant Offer, FAQPage, and BreadcrumbList schemas.
// ═══════════════════════════════════════════════════════════════════

export interface OfferSchemaParams {
  title: string;
  description?: string;
  merchantName: string;
  discountText: string;
  expiresAt?: Date | string | null;
  url: string;
}

export function generateOfferJsonLd(params: OfferSchemaParams) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: params.title,
    description: params.description || params.discountText,
    offeredBy: {
      "@type": "Organization",
      name: params.merchantName,
    },
    priceSpecification: {
      "@type": "PriceSpecification",
      valueAddedTaxIncluded: true,
      description: params.discountText,
    },
    validThrough: params.expiresAt ? new Date(params.expiresAt).toISOString() : undefined,
    url: params.url,
  };
}

export function generateFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
