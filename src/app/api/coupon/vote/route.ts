// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Coupon Vote Handler API
// Route: POST /api/coupon/vote
// Persists upvotes/downvotes and recalculates success rate.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { couponId, voteType, userId } = body;

  if (!couponId || (voteType !== "up" && voteType !== "down")) {
    return NextResponse.json({ error: "Invalid vote parameters." }, { status: 400 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ipHash = hashIp(clientIp);

  // Upsert vote record
  if (userId) {
    await db.couponVote.upsert({
      where: {
        couponId_userId: { couponId, userId },
      },
      update: { voteType, ipHash },
      create: { couponId, userId, voteType, ipHash },
    });
  } else {
    // Guest vote by IP hash
    const existingGuestVote = await db.couponVote.findFirst({
      where: { couponId, ipHash, userId: null },
    });

    if (existingGuestVote) {
      await db.couponVote.update({
        where: { id: existingGuestVote.id },
        data: { voteType },
      });
    } else {
      await db.couponVote.create({
        data: { couponId, ipHash, voteType },
      });
    }
  }

  // Recalculate coupon success rate
  const upVotes = await db.couponVote.count({
    where: { couponId, voteType: "up" },
  });

  const totalVotes = await db.couponVote.count({
    where: { couponId },
  });

  const successRate = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 100;

  await db.coupon.update({
    where: { id: couponId },
    data: { successRate },
  });

  return NextResponse.json({
    success: true,
    couponId,
    voteType,
    successRate,
  });
}
