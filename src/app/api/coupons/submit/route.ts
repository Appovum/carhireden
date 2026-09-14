// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public Merchant Coupon Submission Handler
// Route: POST /api/coupons/submit
// Inserts merchant coupon into the moderation queue with status: "draft".
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { storeName, title, code, discountText, destinationUrl, description, logoUrl } = body;

  if (!storeName || !title || !discountText) {
    return NextResponse.json({ success: false, message: "Store name, title, and discount text are required." }, { status: 400 });
  }

  // Find or create store for submission
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const defaultLogo = logoUrl || `https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`;

  let store = await db.store.findUnique({ where: { slug } });
  if (!store) {
    store = await db.store.create({
      data: {
        name: storeName,
        slug,
        domain: `${slug}.com`,
        logoUrl: defaultLogo,
        rawDestinationUrl: destinationUrl || `https://${slug}.com`,
        isActive: false, // Requires admin moderation
      },
    });
  } else if (logoUrl && !store.logoUrl) {
    store = await db.store.update({
      where: { id: store.id },
      data: { logoUrl },
    });
  }

  const dedupeInput = `submit_${store.id}_${code || title}_${Date.now()}`;
  const dedupeHash = crypto.createHash("sha256").update(dedupeInput).digest("hex");

  const coupon = await db.coupon.create({
    data: {
      storeId: store.id,
      title,
      code: code || null,
      discountText,
      description: description || null,
      destinationUrl: destinationUrl || store.rawDestinationUrl,
      dedupeHash,
      type: code ? "code" : "deal",
      status: "draft", // Placed in Admin Moderation Queue
    },
  });

  return NextResponse.json({
    success: true,
    message: "Thank you! Your coupon submission has been received and added to our moderation queue.",
    couponId: coupon.id,
  });
}
