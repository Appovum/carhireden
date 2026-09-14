// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Reset Password Page
// Route: /reset-password?token=...
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || "";

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-14 flex items-center justify-center w-full">
      <ResetPasswordClient token={token} />
    </main>
  );
}
