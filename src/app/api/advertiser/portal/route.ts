// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Advertiser Portal API Route with Server-Side Sharp Validation
// Route: GET /api/advertiser/portal?token=...
// Route: POST /api/advertiser/portal
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import sharp from "sharp";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: false, error: "Magic token is required to access the Advertiser Portal." }, { status: 400 });
  }

  try {
    const order = await db.featuredOrder.findUnique({
      where: { magicToken: token },
      include: {
        store: true,
        coupon: true,
        adCreative: { include: { adSlot: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Invalid magic portal token." }, { status: 404 });
    }

    // 1. Magic Token Expiration Validation
    if (order.magicTokenExpiresAt && order.magicTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This magic portal access link has expired. Access token lifetime is 30 days." },
        { status: 401 }
      );
    }

    // Fetch all orders for this advertiser email
    const allOrders = await db.featuredOrder.findMany({
      where: { advertiserEmail: order.advertiserEmail },
      include: { store: true, coupon: true, adCreative: true },
      orderBy: { createdAt: "desc" },
    });

    let totalImpressions = 0;
    let totalClicks = 0;

    allOrders.forEach((o) => {
      if (o.adCreative) {
        totalImpressions += o.adCreative.impressionCount || 0;
        totalClicks += o.adCreative.clickCount || 0;
      }
    });

    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    return NextResponse.json({
      success: true,
      advertiserEmail: order.advertiserEmail,
      currentOrder: order,
      orders: allOrders,
      metrics: {
        totalImpressions,
        totalClicks,
        ctr: `${ctr}%`,
      },
    });
  } catch (error: any) {
    console.error("Advertiser portal GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, imageUrl, targetUrl, title } = body;

    if (!token || !imageUrl) {
      return NextResponse.json({ success: false, error: "Magic token and Image URL/Data are required." }, { status: 400 });
    }

    const order = await db.featuredOrder.findUnique({
      where: { magicToken: token },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Invalid magic portal token." }, { status: 404 });
    }

    if (order.magicTokenExpiresAt && order.magicTokenExpiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Magic access link has expired." }, { status: 401 });
    }

    if (order.placementKind !== "banner") {
      return NextResponse.json({ success: false, error: "Artwork upload is only applicable to Banner slot placements." }, { status: 400 });
    }

    // 2. Strict Server-Side Validation via `sharp`
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("data:image/")) {
      const base64Data = imageUrl.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      // If HTTP URL, fetch image buffer safely
      try {
        const fetchRes = await fetch(imageUrl);
        if (!fetchRes.ok) throw new Error("Could not download image from provided URL.");
        const arrayBuf = await fetchRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Server-side image fetch failed: ${err.message}` }, { status: 400 });
      }
    }

    // File size check (Max 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (imageBuffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Image size (${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB) exceeds 5 MB security limit.` },
        { status: 400 }
      );
    }

    let metadata: any;
    try {
      metadata = await sharp(imageBuffer).metadata();
    } catch (sharpErr: any) {
      return NextResponse.json(
        { success: false, error: `Invalid or corrupted image format. Sharp engine decode error: ${sharpErr.message}` },
        { status: 400 }
      );
    }

    // Allowed Formats: png, jpeg, webp, gif (SVG excluded for XSS security)
    const allowedFormats = ["jpeg", "jpg", "png", "webp", "gif"];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return NextResponse.json(
        { success: false, error: `Invalid image format (${metadata.format}). Allowed formats: PNG, JPEG, WebP, GIF.` },
        { status: 400 }
      );
    }

    // Determine required slot dimensions based on planType
    let requiredWidth = 728;
    let requiredHeight = 90;
    let positionSlug = "header_top";

    if (order.planType === "sidebar_rectangle_banner") {
      requiredWidth = 300;
      requiredHeight = 250;
      positionSlug = "store_sidebar";
    } else if (order.planType === "in_feed_card_banner") {
      requiredWidth = 300;
      requiredHeight = 120;
      positionSlug = "in_feed";
    }

    // Strict Dimension Match Check
    if (metadata.width !== requiredWidth || metadata.height !== requiredHeight) {
      return NextResponse.json(
        {
          success: false,
          error: `Server-side Validation Failed: Artwork resolution is ${metadata.width}×${metadata.height}px. The '${order.planType}' slot strictly requires artwork measuring ${requiredWidth}×${requiredHeight}px.`,
        },
        { status: 400 }
      );
    }

    // Ensure slot exists
    let slot = await db.adSlot.findFirst({ where: { positionSlug } });
    if (!slot) {
      slot = await db.adSlot.create({
        data: { name: `${positionSlug} Slot`, positionSlug, isEnabled: true },
      });
    }

    // Create or update AdCreative
    const creative = await db.adCreative.create({
      data: {
        adSlotId: slot.id,
        title: title || order.brandName || "Banner Creative",
        imageUrl,
        targetUrl: targetUrl || order.store?.rawDestinationUrl || "https://couponpilot.com",
        isEnabled: false, // Awaiting admin approval
      },
    });

    const updatedOrder = await db.featuredOrder.update({
      where: { id: order.id },
      data: {
        adCreativeId: creative.id,
        campaignStatus: "pending_review",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Artwork verified server-side (${metadata.width}×${metadata.height}px ${metadata.format.toUpperCase()})! Submitted for admin review.`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Advertiser portal POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
