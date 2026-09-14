// ═══════════════════════════════════════════════════════════════════
// CouponPilot — 404 Page (Not Found)
// Renders instant search bar and popular stores list instead of a dead end.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-16 text-center space-y-8">
      <div className="space-y-3">
        <div className="w-16 h-16 bg-paper-sunken border border-rule rounded-[4px] flex items-center justify-center mx-auto text-ink">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-[28px] sm:text-[34px] text-ink">
          Page Not Found
        </h1>
        <p className="font-body text-[14px] text-muted max-w-md mx-auto">
          The store or offer page you are looking for may have moved or expired. Search our verified store directory below:
        </p>
      </div>

      {/* Search Input Bar */}
      <form action="/search" method="GET" className="max-w-md mx-auto flex gap-2">
        <input
          type="text"
          name="q"
          placeholder="Search stores or brands (e.g. Nike)..."
          className="flex-1 bg-paper-sunken border border-rule rounded-[3px] px-4 py-2.5 text-[14px] font-body text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-ink text-paper font-medium text-[14px] font-body rounded-[3px] hover:bg-ink/90 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          Search
        </button>
      </form>

      {/* Popular Quick Jumps */}
      <div className="pt-4 space-y-3 font-body">
        <span className="text-[12px] font-semibold text-muted uppercase tracking-wider block">Popular Categories</span>
        <div className="flex flex-wrap justify-center gap-2">
          {["Fashion", "Electronics", "Travel", "Home", "Beauty"].map((cat) => (
            <Link
              key={cat}
              href={`/category/${cat.toLowerCase()}`}
              className="px-4 py-2 bg-paper-raised border border-rule hover:border-rule-strong rounded-[3px] text-[13px] font-body text-ink transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Link href="/stores" className="text-[13px] font-body text-ink font-semibold hover:underline">
          Browse All Stores A to Z Directory →
        </Link>
      </div>
    </main>
  );
}
