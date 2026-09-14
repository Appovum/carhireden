// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public Contact Page & Support Form
// Route: /contact
// Real dynamic database info, client form submission to /api/contact.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { DEFAULT_PAGES } from "@/lib/constants/defaultPages";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const setting = await db.setting.findUnique({ where: { key: "page_contact" } });
  const data = setting ? JSON.parse(setting.valueJson) : DEFAULT_PAGES.contact;
  return {
    title: data?.metaTitle || DEFAULT_PAGES.contact.metaTitle,
    description: data?.metaDescription || DEFAULT_PAGES.contact.metaDescription,
  };
}

export default async function ContactPage() {
  const setting = await db.setting.findUnique({ where: { key: "page_contact" } });
  const dbData = setting ? JSON.parse(setting.valueJson) : null;
  const page = { ...DEFAULT_PAGES.contact, ...dbData };

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

      {/* Layout: Info cards + Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Details Column */}
        <div className="space-y-4">
          <div className="bg-paper-raised border border-rule rounded-[4px] p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-ink border-b border-rule pb-2">
              Support Details
            </h3>

            {page.email && (
              <div>
                <span className="text-[11px] font-mono font-medium text-muted uppercase">Email</span>
                <p className="text-[13px] font-medium text-ink">
                  <a href={`mailto:${page.email}`} className="hover:underline">
                    {page.email}
                  </a>
                </p>
              </div>
            )}

            {page.phone && (
              <div>
                <span className="text-[11px] font-mono font-medium text-muted uppercase">Phone</span>
                <p className="text-[13px] font-mono text-ink">{page.phone}</p>
              </div>
            )}

            {page.address && (
              <div>
                <span className="text-[11px] font-mono font-medium text-muted uppercase">Office</span>
                <p className="text-[13px] text-muted leading-relaxed">{page.address}</p>
              </div>
            )}
          </div>

          <div className="bg-paper-sunken border border-rule rounded-[4px] p-4 text-[12px] text-muted space-y-1">
            <span className="font-semibold text-ink">Tip: Missing Cashback?</span>
            <p>
              Make sure to include your order ID and transaction date so we can assist you faster.
            </p>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-2 bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8">
          <ContactForm initialNote={page.content} />
        </div>
      </div>
    </main>
  );
}
