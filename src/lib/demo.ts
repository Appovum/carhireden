// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Global Demo Mode Utility
// Controls read-only protection for CodeCanyon live demo environments.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

/**
 * Returns true if the application is running in public demo mode.
 * Set NEXT_PUBLIC_DEMO_MODE=true or DEMO_MODE=true in .env to activate.
 */
export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.DEMO_MODE === "true"
  );
}

export const DEMO_MODE_ERROR_MESSAGE =
  "Demo Mode Active: Settings and database modifications are disabled in live public preview mode.";

export const DEMO_MODE_RESPONSE = {
  success: false,
  error: DEMO_MODE_ERROR_MESSAGE,
  isDemoMode: true,
};

export function guardDemoMode() {
  if (isDemoMode()) {
    return NextResponse.json(DEMO_MODE_RESPONSE, { status: 403 });
  }
  return null;
}
