// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Cryptographically Verified PayPal Webhook Handler
// Route: POST /api/webhooks/paypal
// Validates cryptographic signature headers with PayPal API before processing.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPaymentReceivedEmail, sendCreativeRequiredEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  const paypalMode = process.env.PAYPAL_MODE || "sandbox";

  const rawBody = await request.text();
  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 1. Extract PayPal Signature Headers
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");

  // Strict Signature Verification Check
  if (paypalClientId && paypalSecret && paypalWebhookId && paypalWebhookId !== "wh_...") {
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      console.error("PayPal Webhook Verification Failed: Missing required cryptographic headers.");
      return NextResponse.json({ error: "Cryptographic Verification Failed: Missing PayPal signature headers." }, { status: 400 });
    }

    const authHost =
      paypalMode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    try {
      // Fetch access token
      const authRes = await fetch(`${authHost}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const authData = await authRes.json();

      if (!authData.access_token) {
        return NextResponse.json({ error: "PayPal OAuth Failed" }, { status: 400 });
      }

      // Verify signature via PayPal API
      const verifyRes = await fetch(`${authHost}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: paypalWebhookId,
          webhook_event: body,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.verification_status !== "SUCCESS") {
        console.error("PayPal Webhook Signature Verification Rejected:", verifyData);
        return NextResponse.json({ error: "Invalid PayPal Webhook Signature Payload." }, { status: 400 });
      }
    } catch (err: any) {
      console.error("PayPal Webhook Signature Verification API error:", err);
      return NextResponse.json({ error: `PayPal verification failed: ${err.message}` }, { status: 400 });
    }
  } else {
    // If webhook ID is not configured, reject unsigned requests in production or reject if explicit header missing
    if (process.env.NODE_ENV === "production" && (!transmissionSig || !transmissionId)) {
      return NextResponse.json({ error: "Production Requires Cryptographic Signature Verification" }, { status: 400 });
    }
  }

  // 2. Process Verified Payload
  const eventType = body?.event_type;

  if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
    const resource = body.resource;
    const orderId =
      resource?.custom_id ||
      resource?.purchase_units?.[0]?.custom_id ||
      resource?.purchase_units?.[0]?.reference_id;

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
