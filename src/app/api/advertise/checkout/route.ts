// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Advertiser Checkout Session Creator Route
// Route: POST /api/advertise/checkout
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { PLACEMENT_PLANS } from "../config/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      advertiserEmail,
      brandName,
      durationDays = 7,
      planType = "featured_store",
      storeId,
      couponId,
      paymentGateway = "stripe",
    } = body;

    const matchedPlacement = PLACEMENT_PLANS.find((p) => p.id === planType) || PLACEMENT_PLANS[0];
    const placementKind = matchedPlacement.placementKind;

    // Validation
    if (placementKind === "boost") {
      if (!storeId && !couponId) {
        return NextResponse.json(
          {
            success: false,
            error: "For position boosts, you must select an existing store or offer from the catalog picker.",
          },
          { status: 400 }
        );
      }
    }

    if (!advertiserEmail || !advertiserEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid advertiser email address." },
        { status: 400 }
      );
    }

    // Resolve brand name from DB store if linked
    let resolvedBrandName = brandName || "Advertiser Brand";
    if (storeId) {
      const storeObj = await db.store.findUnique({ where: { id: storeId } });
      if (storeObj) resolvedBrandName = storeObj.name;
    }

    const dailyRateMinor = matchedPlacement.dailyRateMinor;
    const priceMinor = durationDays * dailyRateMinor;
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Initial campaign status based on placementKind
    const initialCampaignStatus = placementKind === "boost" ? "pending_review" : "awaiting_creative";

    const orderData: any = {
      placementKind,
      planType,
      paymentGateway,
      paymentStatus: "pending",
      campaignStatus: initialCampaignStatus,
      advertiserEmail: advertiserEmail.trim().toLowerCase(),
      brandName: resolvedBrandName,
      startsAt,
      endsAt,
      priceMinor,
      currency: paymentGateway === "paypal" ? "USD_PAYPAL" : "USD",
    };
    if (storeId) orderData.storeId = storeId;
    if (couponId) orderData.couponId = couponId;

    const featuredOrder = await db.featuredOrder.create({
      data: orderData,
    });

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${origin}/advertise?orderId=${featuredOrder.id}&status=success`;
    const cancelUrl = `${origin}/advertise?orderId=${featuredOrder.id}&status=cancelled`;

    // ═══════════════════════════════════════════════════════════════
    // 1. STRIPE GATEWAY
    // ═══════════════════════════════════════════════════════════════
    if (paymentGateway === "stripe") {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey || stripeSecretKey.includes("...")) {
        return NextResponse.json(
          { success: false, error: "Stripe API Key missing or invalid in .env.local" },
          { status: 400 }
        );
      }

      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-01-27.acacia" as any });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: advertiserEmail.trim().toLowerCase(),
          metadata: {
            orderId: featuredOrder.id,
            placementKind,
            advertiserEmail: advertiserEmail.trim().toLowerCase(),
          },
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `CouponPilot — ${matchedPlacement.name} (${durationDays} Days)`,
                  description: `Advertiser placement campaign for ${resolvedBrandName}`,
                },
                unit_amount: priceMinor,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: featuredOrder.id,
        });

        if (session.url) {
          return NextResponse.json({
            success: true,
            orderId: featuredOrder.id,
            checkoutUrl: session.url,
          });
        }
      } catch (stripeErr: any) {
        console.error("Stripe Checkout Error:", stripeErr);
        return NextResponse.json(
          { success: false, error: stripeErr.message || "Invalid Stripe API key provided." },
          { status: 400 }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. PAYPAL GATEWAY
    // ═══════════════════════════════════════════════════════════════
    if (paymentGateway === "paypal") {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;
      const paypalMode = process.env.PAYPAL_MODE || "sandbox";

      if (!paypalClientId || !paypalSecret) {
        return NextResponse.json(
          { success: false, error: "PayPal credentials missing in environment settings." },
          { status: 400 }
        );
      }

      const authHost =
        paypalMode === "live"
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";

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
        return NextResponse.json(
          { success: false, error: "Failed to authenticate with PayPal API." },
          { status: 400 }
        );
      }

      const orderRes = await fetch(`${authHost}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: featuredOrder.id,
              custom_id: featuredOrder.id,
              amount: {
                currency_code: "USD",
                value: (priceMinor / 100).toFixed(2),
              },
              description: `CouponPilot — ${matchedPlacement.name} (${durationDays} Days)`,
            },
          ],
          application_context: {
            brand_name: "CouponPilot",
            return_url: successUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      const paypalOrder = await orderRes.json();
      const approveLink = paypalOrder.links?.find((l: any) => l.rel === "approve")?.href;

      if (approveLink) {
        return NextResponse.json({
          success: true,
          orderId: featuredOrder.id,
          checkoutUrl: approveLink,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "No valid payment gateway response." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Checkout creation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
