// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public Privacy Policy Page
// Route: /privacy
// Dynamic settings fetching, Space Grotesk typography, design system tokens.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { DEFAULT_PAGES } from "@/lib/constants/defaultPages";
import { MarkdownContent } from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const setting = await db.setting.findUnique({ where: { key: "page_privacy" } });
  const data = setting ? JSON.parse(setting.valueJson) : DEFAULT_PAGES.privacy;
  return {
    title: data?.metaTitle || DEFAULT_PAGES.privacy.metaTitle,
    description: data?.metaDescription || DEFAULT_PAGES.privacy.metaDescription,
  };
}

export default async function PrivacyPage() {
  const setting = await db.setting.findUnique({ where: { key: "page_privacy" } });
  const dbData = setting ? JSON.parse(setting.valueJson) : null;
  const page = { ...DEFAULT_PAGES.privacy, ...dbData };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header Hero */}
      <div className="border-b border-rule pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-paper-sunken border border-rule text-[12px] font-mono font-medium text-muted uppercase">
          <span>Legal</span>
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

      {/* Policy Body */}
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8">
        <MarkdownContent content={page.content} />
      </div>
    </main>
  );
}
