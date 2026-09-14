import { db } from "@/lib/db";
import { MarkdownContent } from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

export default async function CookiesPage() {
  const setting = await db.setting.findUnique({ where: { key: "legal_cookies" } });
  const content = setting
    ? JSON.parse(setting.valueJson)
    : "## Cookie Policy\n\nCouponPilot uses essential cookies to authenticate users, maintain session state, and track referral/cashback attribution across store visits.";

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 font-body">
      <div className="border-b border-rule pb-4 space-y-1">
        <h1 className="font-display font-bold text-display-md text-ink">Cookie Policy</h1>
        <p className="text-[13px] text-muted">How CouponPilot uses cookies and tracking technologies.</p>
      </div>
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 sm:p-8">
        <MarkdownContent content={content} />
      </div>
    </main>
  );
}
