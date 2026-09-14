// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public About Page
// Route: /about
// Dynamic settings fetching, Space Grotesk typography, and trust tokens.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { db } from "@/lib/db";
import { DEFAULT_PAGES } from "@/lib/constants/defaultPages";
import { MarkdownContent } from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const setting = await db.setting.findUnique({ where: { key: "page_about" } });
  const data = setting ? JSON.parse(setting.valueJson) : DEFAULT_PAGES.about;
  return {
    title: data?.metaTitle || DEFAULT_PAGES.about.metaTitle,
    description: data?.metaDescription || DEFAULT_PAGES.about.metaDescription,
  };
}

export default async function AboutPage() {
  const setting = await db.setting.findUnique({ where: { key: "page_about" } });
  const dbData = setting ? JSON.parse(setting.valueJson) : null;
  const page = { ...DEFAULT_PAGES.about, ...dbData };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header Hero */}
      <div className="border-b border-rule pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-paper-sunken border border-rule text-[12px] font-mono font-medium text-muted uppercase">
          <span>Company</span>
        </div>
        <h1 className="font-display font-bold text-display-md sm:text-display-lg text-ink">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-body-lg text-muted max-w-2xl">
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Value Prop Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
          <span className="font-display font-bold text-display-sm text-money">100% Tested</span>
          <p className="text-[13px] text-muted">Every promo code is verified before listing.</p>
        </div>

        <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
          <span className="font-display font-bold text-display-sm text-ink">Direct Cashback</span>
          <p className="text-[13px] text-muted">We share our affiliate merchant commissions back with you.</p>
        </div>

        <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
          <span className="font-display font-bold text-display-sm text-ink">Zero Spam</span>
          <p className="text-[13px] text-muted">No popups, no malware, and transparent discount tracking.</p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8">
        <MarkdownContent content={page.content} />
      </div>

      {/* CTA banner */}
      <div className="bg-paper-sunken border border-rule rounded-[4px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-[16px] text-ink">Ready to start saving?</h3>
          <p className="text-[13px] text-muted">Browse top store promo codes and cash back deals right now.</p>
        </div>
        <Link
          href="/stores"
          className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors whitespace-nowrap"
        >
          Explore all stores →
        </Link>
      </div>
    </main>
  );
}
