// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public Settings API Route
// Route: GET /api/settings
// Returns branding & public site configurations dynamically.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            "site_name",
            "support_email",
            "default_currency",
            "currency_exchange_rate",
            "min_withdrawal",
            "cashback_split",
            "legal_disclosure",
          ],
        },
      },
    });

    const result: Record<string, any> = {
      site_name: "CouponPilot",
      support_email: "support@couponpilot.com",
      default_currency: "USD",
      currency_exchange_rate: 1.0,
      min_withdrawal: "10.00",
      cashback_split: "50",
    };

    settings.forEach((s) => {
      try {
        result[s.key] = JSON.parse(s.valueJson);
      } catch {
        result[s.key] = s.valueJson;
      }
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      settings: {
        site_name: "CouponPilot",
        support_email: "support@couponpilot.com",
        default_currency: "USD",
        currency_exchange_rate: 1.0,
      },
    });
  }
}
