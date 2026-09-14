// ═══════════════════════════════════════════════════════════════════
// Coupon Detail Page — /coupon/[slug]
// Single offer detail, terms, how-to-use, related store offers, FAQ block, JSON-LD.
// ═══════════════════════════════════════════════════════════════════

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { CouponRow } from "@/components/CouponRow";
import { generateOfferJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonLd";
import { Coupon } from "@/types";

export const dynamic = "force-dynamic";

export default async function CouponDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reveal?: string }>;
}) {
  const { slug } = await params;
  const { reveal } = await searchParams;

  const coupon = await db.coupon.findFirst({
    where: {
      OR: [{ id: slug }, { dedupeHash: slug }],
    },
    include: { store: true },
  });

  if (!coupon) {
    notFound();
  }

  const relatedDbCoupons = await db.coupon.findMany({
    where: {
      storeId: coupon.storeId,
      id: { not: coupon.id },
      status: "active",
    },
    take: 5,
  });

  const isExpired = coupon.status === "expired";
  const autoReveal = reveal === "true";

  const mappedCoupon: Coupon = {
    id: coupon.id,
    storeId: coupon.storeId,
    storeName: coupon.store.name,
    storeSlug: coupon.store.slug,
    storeLogo: coupon.store.logoUrl || "",
    type: coupon.type as any,
    status: coupon.status as any,
    code: coupon.code || undefined,
    title: coupon.title,
    description: coupon.description || undefined,
    discountText: coupon.discountText,
    discountValue: coupon.discountValue || undefined,
    merchantUrl: coupon.destinationUrl || coupon.store.rawDestinationUrl,
    successRate: coupon.successRate,
    usedToday: coupon.usedTodayCount,
    verifiedAt: coupon.verifiedAt.toISOString(),
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : undefined,
    cashbackRate: coupon.cashbackRate || coupon.store.defaultCashbackRate || undefined,
    isExclusive: coupon.isExclusive,
    isFeatured: coupon.isFeatured,
  };

  const relatedCoupons: Coupon[] = relatedDbCoupons.map((c) => ({
    id: c.id,
    storeId: c.storeId,
    storeName: coupon.store.name,
    storeSlug: coupon.store.slug,
    storeLogo: coupon.store.logoUrl || "",
    type: c.type as any,
    status: c.status as any,
    code: c.code || undefined,
    title: c.title,
    description: c.description || undefined,
    discountText: c.discountText,
    merchantUrl: c.destinationUrl || coupon.store.rawDestinationUrl,
    successRate: c.successRate,
    usedToday: c.usedTodayCount,
    verifiedAt: c.verifiedAt.toISOString(),
  }));

  const faqs = [
    {
      question: `How do I use this ${coupon.store.name} coupon?`,
      answer: `Click "Get Code" to reveal the promo code, copy it, and paste it at checkout on ${coupon.store.domain}.`,
    },
    {
      question: `Is this ${coupon.store.name} discount verified?`,
      answer: `Yes! Our verification system tested this deal with a ${coupon.successRate}% success rate.`,
    },
  ];

  const offerJsonLd = generateOfferJsonLd({
    title: coupon.title,
    description: coupon.description || coupon.discountText,
    merchantName: coupon.store.name,
    discountText: coupon.discountText,
    expiresAt: coupon.expiresAt,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://couponpilot.com"}/coupon/${coupon.id}`,
  });

  const faqJsonLd = generateFaqJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/" className="hover:text-slate-200">Home</Link>
          <span>/</span>
          <Link href={`/store/${coupon.store.slug}`} className="hover:text-slate-200">{coupon.store.name}</Link>
          <span>/</span>
          <span className="text-slate-200">{coupon.discountText}</span>
        </nav>

        {/* Expired Notice Banner if applicable */}
        {isExpired && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-200 text-sm font-body">
            <strong>This offer has expired.</strong> Check out live active offers from {coupon.store.name} below!
          </div>
        )}

        {/* Main Coupon Card */}
        <div className="bg-paper-raised border border-rule p-6 rounded-[4px] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-money/10 text-money border border-money/20 text-xs font-bold rounded">
              {coupon.discountText}
            </span>
            {isExpired && (
              <span className="px-2.5 py-0.5 bg-urgent/10 text-urgent border border-urgent/20 text-xs font-bold rounded">
                Expired
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-ink">{coupon.title}</h1>
          {coupon.description && <p className="text-sm text-muted leading-relaxed">{coupon.description}</p>}

          {/* Auto-revealed Code Block */}
          {(autoReveal || coupon.code) && (
            <div className="bg-paper-sunken border border-rule p-4 rounded flex items-center justify-between">
              <div>
                <span className="text-xs text-muted block font-code uppercase">Promo Code</span>
                <span className="text-lg font-mono font-bold text-money">{coupon.code || "DEAL ACTIVATED"}</span>
              </div>
              <a
                href={`/go/${coupon.id}?couponId=${coupon.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-ink text-paper font-bold text-xs rounded hover:bg-ink/90 transition-colors"
              >
                Go to {coupon.store.name} →
              </a>
            </div>
          )}
        </div>

        {/* Related Store Offers */}
        {relatedCoupons.length > 0 && (
          <section className="space-y-3 pt-4">
            <h2 className="font-display text-lg font-bold text-ink">More Active {coupon.store.name} Deals</h2>
            <div className="space-y-2.5">
              {relatedCoupons.map((rel) => (
                <CouponRow key={rel.id} coupon={rel} />
              ))}
            </div>
          </section>
        )}

        {/* FAQ Block */}
        <section className="bg-paper-raised border border-rule p-6 rounded-[4px] space-y-4 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">{faq.question}</h3>
                <p className="text-xs text-muted leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
