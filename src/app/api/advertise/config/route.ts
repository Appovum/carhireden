// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Self-Serve Placement Plan Configurations API Route
// Route: GET /api/advertise/config
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

export interface PlacementPlanConfig {
  id: string;
  name: string;
  placementKind: "boost" | "banner";
  dailyRateMinor: number;
  description: string;
  requiredDimensions?: string; // For banner plans (e.g. "728x90")
  slotPosition?: string; // For banner plans (e.g. "header_top")
  targetType?: "store" | "coupon"; // For boost plans
}

export const PLACEMENT_PLANS: PlacementPlanConfig[] = [
  {
    id: "featured_store",
    name: "Featured Store Placement (Directory & Search Top)",
    placementKind: "boost",
    dailyRateMinor: 1800, // $18.00 / day
    description: "Promote your store to the top of the store directory, search results, and homepage header.",
    targetType: "store",
  },
  {
    id: "top_offer_spot",
    name: "Top Offer Spot (Category & Store Page Hero)",
    placementKind: "boost",
    dailyRateMinor: 1500, // $15.00 / day
    description: "Pin your coupon offer as the verified #1 hero deal on category and store listing pages.",
    targetType: "coupon",
  },
  {
    id: "header_leaderboard_banner",
    name: "Header Top Leaderboard Banner (728×90)",
    placementKind: "banner",
    dailyRateMinor: 2500, // $25.00 / day
    description: "High-visibility 728×90 leaderboard image banner rendered directly above the site navigation bar.",
    requiredDimensions: "728x90",
    slotPosition: "header_top",
  },
  {
    id: "sidebar_rectangle_banner",
    name: "Store Sidebar Rectangle Banner (300×250)",
    placementKind: "banner",
    dailyRateMinor: 2000, // $20.00 / day
    description: "Prominent 300×250 medium rectangle display ad rendered in store detail page sidebars.",
    requiredDimensions: "300x250",
    slotPosition: "store_sidebar",
  },
  {
    id: "in_feed_card_banner",
    name: "In-Feed Listing Card Banner (300×120)",
    placementKind: "banner",
    dailyRateMinor: 1200, // $12.00 / day
    description: "Native in-feed card banner rendered directly between coupon feed listings.",
    requiredDimensions: "300x120",
    slotPosition: "in_feed",
  },
];

export async function GET() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;

  return NextResponse.json({
    success: true,
    placements: PLACEMENT_PLANS,
    durations: [7, 14, 30, 60],
    paymentMethods: {
      stripeEnabled: !!stripeSecretKey && !stripeSecretKey.includes("..."),
      paypalEnabled: !!paypalClientId && !paypalClientId.includes("..."),
    },
  });
}
