// ═══════════════════════════════════════════════════════════════════
// Empty & Error States
//
// An empty state is an invitation, not an apology.
// An error says what happened and what to do next.
// ═══════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  type: "wishlist" | "no-results" | "expired-store" | "no-coupons";
  storeName?: string;
  query?: string;
  onAction?: () => void;
}

export function EmptyState({ type, storeName, query, onAction }: EmptyStateProps) {
  const configs = {
    wishlist: {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-rule-strong">
          <path d="M20 35L5 20C2.5 17.5 2.5 13.5 5 11C7.5 8.5 11.5 8.5 14 11L20 17L26 11C28.5 8.5 32.5 8.5 35 11C37.5 13.5 37.5 17.5 35 20L20 35Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ),
      title: "Start saving",
      description: "Save coupons you want to use later. Search for your favorite stores to get started.",
      actionLabel: "Search stores",
    },
    "no-results": {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-rule-strong">
          <circle cx="18" cy="18" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M25.5 25.5L35 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 18H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: `No results for "${query || "..."}"`,
      description: "Try a different store name or browse by category.",
      actionLabel: "Browse categories",
    },
    "expired-store": {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-rule-strong">
          <rect x="4" y="8" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M14 8V32" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M20 18L26 24M26 18L20 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: "This code has expired",
      description: storeName
        ? `Check ${storeName}'s active coupons — there may be something better.`
        : "Check this store's active coupons — there may be something better.",
      actionLabel: "See active coupons",
    },
    "no-coupons": {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-rule-strong">
          <rect x="4" y="8" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M14 8V32" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="26" cy="20" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: storeName ? `No active coupons for ${storeName}` : "No coupons here yet",
      description: "We're watching for new deals. Check back soon, or try a similar store.",
      actionLabel: "Browse popular stores",
    },
  };

  const config = configs[type];

  return (
    <div className="flex flex-col items-center py-12 px-4 text-center">
      <div className="mb-4">{config.icon}</div>
      <h2 className="font-display font-semibold text-[18px] text-ink mb-1.5">
        {config.title}
      </h2>
      <p className="text-[14px] font-body text-muted max-w-sm mb-5">
        {config.description}
      </p>
      {config.actionLabel && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 text-[14px] font-body font-medium bg-ink text-paper rounded-[3px] hover:bg-ink/90 active:bg-ink/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {config.actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong loading coupons.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-12 px-4 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        className="text-urgent mb-4"
      >
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" />
        <path
          d="M20 12V22"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="27" r="1.5" fill="currentColor" />
      </svg>
      <h2 className="font-display font-semibold text-[18px] text-ink mb-1.5">
        {message}
      </h2>
      <p className="text-[14px] font-body text-muted max-w-sm mb-5">
        Try refreshing the page. If it keeps happening, the issue is on our end and we&apos;re working on it.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 text-[14px] font-body font-medium border border-rule text-ink rounded-[3px] hover:bg-paper-sunken transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Try again
        </button>
      )}
    </div>
  );
}
