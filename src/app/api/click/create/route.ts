// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Server-Side Click Creation Endpoint
// Route: POST /api/click/create
// Creates a click record and returns the outbound /go/[clickId] URL.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { detectBot } from "@/lib/botDetector";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { couponId, storeId, userId } = body;

  let store = storeId
    ? await db.store.findUnique({ where: { id: storeId } })
    : null;

  let coupon = couponId
    ? await db.coupon.findUnique({ where: { id: couponId }, include: { store: true } })
    : null;

  if (!store && coupon?.store) {
    store = coupon.store;
  }

  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ipHash = hashIp(clientIp);

  const botResult = detectBot(userAgent);

  const clickId = `click_${crypto.randomBytes(12).toString("hex")}`;
  const rawDestinationUrl = coupon?.destinationUrl || store.rawDestinationUrl;

  const click = await db.click.create({
    data: {
      id: clickId,
      subId: clickId,
      couponId: coupon?.id || null,
      storeId: store.id,
      networkId: coupon?.networkId || store.affiliateNetworkId || null,
      ipHash,
      userAgent,
      referer,
      botScore: botResult.botScore,
      isBot: botResult.isBot,
      rawDestinationUrl,
      finalUrl: rawDestinationUrl,
      userId: userId || null,
    },
  });

  if (coupon) {
    await db.coupon.update({
      where: { id: coupon.id },
      data: {
        usedCount: { increment: 1 },
        usedTodayCount: { increment: 1 },
      },
    });
  }

  const clickUrl = `/go/${click.id}${couponId ? `?couponId=${couponId}` : ""}`;

  return NextResponse.json({
    clickId: click.id,
    clickUrl,
  });
}
