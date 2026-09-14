// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Signup Page
// Route: /signup
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { SignupClient } from "./SignupClient";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; referral?: string; referredByCode?: string }>;
}) {
  const params = await searchParams;
  const initialRef = params.ref || params.referral || params.referredByCode || "";

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-14 flex items-center justify-center w-full">
      <SignupClient initialRef={initialRef} />
    </main>
  );
}
