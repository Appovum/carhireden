// ═══════════════════════════════════════════════════════════════════
// CouponPilot — AppShell Layout Shell Component
// Persistent Header & Footer wrapper for public/account routes.
// Excludes Admin routes (which use AdminSidebar layout).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ReferralTracker } from "./ReferralTracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin routes handle their own layout via src/app/admin/layout.tsx
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>
      <Header />
      {children}
      <Footer />
    </>
  );
}
