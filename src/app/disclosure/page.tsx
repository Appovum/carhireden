import { db } from "@/lib/db";
import { MarkdownContent } from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

export default async function DisclosurePage() {
  const setting = await db.setting.findUnique({ where: { key: "legal_disclosure" } });
  const content = setting
    ? JSON.parse(setting.valueJson)
    : "## Affiliate Disclosure\n\nCouponPilot is a user-supported coupon and cashback platform. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you.";

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 font-body">
      <div className="border-b border-rule pb-4 space-y-1">
        <h1 className="font-display font-bold text-display-md text-ink">Affiliate Disclosure</h1>
        <p className="text-[13px] text-muted">Transparency regarding our affiliate partner relationships.</p>
      </div>
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8">
        <MarkdownContent content={content} />
      </div>
    </main>
  );
}
