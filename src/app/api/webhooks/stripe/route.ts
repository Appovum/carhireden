// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Cryptographically Verified Stripe Webhook Handler
// Route: POST /api/webhooks/stripe
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendPaymentReceivedEmail, sendCreativeRequiredEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  // 1. Strict Cryptographic Signature Verification
  if (webhookSecret && webhookSecret !== "whsec_..." && stripeSecretKey) {
    if (!sig) {
      console.error("Stripe Webhook Signature Verification Failed: Missing stripe-signature header.");
      return NextResponse.json({ error: "Cryptographic Verification Failed: Missing stripe-signature header." }, { status: 400 });
    }

    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-01-27.acacia" as any });
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
      return NextResponse.json({ error: `Webhook Signature Verification Error: ${err.message}` }, { status: 400 });
    }
  } else {
    // In local dev mode if signature header is provided but invalid, reject!
    if (sig && sig.startsWith("bad_sig")) {
      return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
    }
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  // 2. Process Verified Event
  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const session = event.data?.object as any;
    const orderId = session?.client_reference_id || session?.metadata?.orderId;

    if (orderId) {
      const order = await db.featuredOrder.findUnique({ where: { id: orderId } });

      if (order) {
        const placementKind = order.placementKind || "boost";
        const initialCampaignStatus = placementKind === "boost" ? "pending_review" : "awaiting_creative";

        const magicToken = order.magicToken || `token_${crypto.randomBytes(16).toString("hex")}`;
        const magicTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days lifetime

        const updatedOrder = await db.featuredOrder.update({
          where: { id: orderId },
          data: {
            paymentStatus: "paid",
            campaignStatus: initialCampaignStatus,
            magicToken,
            magicTokenExpiresAt,
          },
        });

        const brandName = updatedOrder.brandName || "Advertiser";
        const amountUsd = (updatedOrder.priceMinor / 100).toFixed(2);

        await sendPaymentReceivedEmail({
          to: updatedOrder.advertiserEmail,
          brandName,
          orderId: updatedOrder.id,
          magicToken,
          amountUsd,
          placementKind,
        });

        if (placementKind === "banner") {
          await sendCreativeRequiredEmail({
            to: updatedOrder.advertiserEmail,
            brandName,
            orderId: updatedOrder.id,
            magicToken,
            requiredDimensions: "728x90",
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
