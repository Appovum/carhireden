// ═══════════════════════════════════════════════════════════════════
// Wallet Page Loading Skeleton — Zero layout shift
// ═══════════════════════════════════════════════════════════════════

import React from "react";

export default function WalletLoading() {
  return (
    <main className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 py-6 sm:py-8 overflow-x-hidden box-border animate-pulse">
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 mb-6">
        <div className="h-7 bg-paper-sunken rounded w-44 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-paper-sunken rounded" />
          ))}
        </div>
      </div>
    </main>
  );
}
