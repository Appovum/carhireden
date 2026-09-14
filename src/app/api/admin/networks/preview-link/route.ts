// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Link Template Live Preview Endpoint
// Route: POST /api/admin/networks/preview-link
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { buildAffiliateLink } from "@/lib/linkBuilder";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { linkTemplate, affiliateId, merchantId, subId = "sample_click_123", destinationUrl = "https://example.com/product" } = body;

  if (!linkTemplate) {
    return NextResponse.json(
      { success: false, previewUrl: destinationUrl, message: "Missing link template." },
      { status: 400 }
    );
  }

  const previewUrl = buildAffiliateLink({
    linkTemplate,
    affiliateId: affiliateId || "SAMPLE_AFF_ID",
    merchantId: merchantId || "SAMPLE_MERCH_ID",
    subId,
    destinationUrl,
  });

  return NextResponse.json({
    success: true,
    previewUrl,
  });
}
