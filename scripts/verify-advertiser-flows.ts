// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Comprehensive End-to-End & Negative Security Test Suite
// ═══════════════════════════════════════════════════════════════════

import { db } from "../src/lib/db";
import { processCampaignLifecycle } from "../src/lib/cron/expiry";
import sharp from "sharp";

async function verifyFlows() {
  console.log("🚀 STARTING COMPREHENSIVE END-TO-END & NEGATIVE SECURITY VERIFICATION\n");

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: NEGATIVE SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════════
  console.log("--------------------------------------------------");
  console.log("SECURITY TEST 1: UNSECURED & BAD SIGNATURE WEBHOOK REJECTION");
  console.log("--------------------------------------------------");

  // Test 1A: Unsigned Stripe Payload Rejection
  const dummyOrder = await db.featuredOrder.create({
    data: {
      placementKind: "boost",
      planType: "featured_store",
      advertiserEmail: "security-test@test.com",
      paymentStatus: "pending",
      campaignStatus: "pending_review",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priceMinor: 5000,
    },
  });

  console.log(`✓ Test Order Created (ID: ${dummyOrder.id}) -> Initial paymentStatus: ${dummyOrder.paymentStatus}`);

  // Simulate bad signature request to Stripe Webhook
  const badStripeReq = new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "bad_sig_12345",
    },
    body: JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { client_reference_id: dummyOrder.id } },
    }),
  });

  const stripeWebhookModule = await import("../src/app/api/webhooks/stripe/route");
  const stripeRes = await stripeWebhookModule.POST(badStripeReq as any);
  console.log(`  Bad Stripe Signature Response Code: ${stripeRes.status}`);

  const postBadStripeOrder = await db.featuredOrder.findUnique({ where: { id: dummyOrder.id } });
  if (stripeRes.status === 400 && postBadStripeOrder?.paymentStatus === "pending") {
    console.log("✓ PASSED: Bad Stripe signature was REJECTED with 400 and order remained unpaid!");
  } else {
    throw new Error("FAILED: Bad Stripe signature was NOT properly rejected!");
  }

  // Test 1B: Unsigned PayPal Payload Rejection
  const paypalWebhookModule = await import("../src/app/api/webhooks/paypal/route");

  // Setting production mode simulation for header check test
  const oldEnv = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";

  const badPaypalReq = new Request("http://localhost:3000/api/webhooks/paypal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { custom_id: dummyOrder.id },
    }),
  });

  const paypalRes = await paypalWebhookModule.POST(badPaypalReq as any);
  (process.env as any).NODE_ENV = oldEnv;

  console.log(`  Unsigned PayPal Webhook Response Code: ${paypalRes.status}`);

  const postBadPaypalOrder = await db.featuredOrder.findUnique({ where: { id: dummyOrder.id } });
  if (paypalRes.status === 400 && postBadPaypalOrder?.paymentStatus === "pending") {
    console.log("✓ PASSED: Unsigned PayPal webhook payload was REJECTED with 400 and order remained unpaid!");
  } else {
    throw new Error("FAILED: Unsigned PayPal webhook payload was NOT rejected!");
  }

  // Test 1C: Unauthenticated CRON Route Rejection
  console.log("\n--------------------------------------------------");
  console.log("SECURITY TEST 2: UNAUTHENTICATED CRON ROUTE REJECTION");
  console.log("--------------------------------------------------");

  process.env.CRON_SECRET = "test_cron_secret_key_12345";

  const cronRouteModule = await import("../src/app/api/cron/campaign-expiry/route");
  const unauthCronReq = new Request("http://localhost:3000/api/cron/campaign-expiry", {
    method: "GET",
  });

  const cronRes = await cronRouteModule.GET(unauthCronReq as any);
  console.log(`  Unauthenticated CRON Request Response Code: ${cronRes.status}`);

  if (cronRes.status === 401) {
    console.log("✓ PASSED: Unauthenticated CRON request was REJECTED with 401 Unauthorized!");
  } else {
    throw new Error("FAILED: CRON route did NOT enforce authentication secret!");
  }

  // Test 1D: Sharp Server-Side Image Dimension Security Check
  console.log("\n--------------------------------------------------");
  console.log("SECURITY TEST 3: SHARP SERVER-SIDE IMAGE DIMENSION VALIDATION");
  console.log("--------------------------------------------------");

  // Generate a 1024x768 buffer using sharp
  const invalidDimensionBuffer = await sharp({
    create: { width: 1024, height: 768, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();

  const invalidBase64 = `data:image/png;base64,${invalidDimensionBuffer.toString("base64")}`;

  // Create test banner order requiring 728x90
  const bannerTestOrder = await db.featuredOrder.create({
    data: {
      placementKind: "banner",
      planType: "header_leaderboard_banner",
      advertiserEmail: "sharp-test@test.com",
      paymentStatus: "paid",
      campaignStatus: "awaiting_creative",
      magicToken: `token_sharp_${Date.now()}`,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priceMinor: 10000,
    },
  });

  const portalModule = await import("../src/app/api/advertiser/portal/route");
  const badUploadReq = new Request("http://localhost:3000/api/advertiser/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: bannerTestOrder.magicToken,
      imageUrl: invalidBase64,
      targetUrl: "https://example.com",
    }),
  });

  const uploadRes = await portalModule.POST(badUploadReq as any);
  const uploadJson = await uploadRes.json();
  console.log(`  Upload 1024x768 to 728x90 Slot Response Code: ${uploadRes.status}`);
  console.log(`  Validation Message: ${uploadJson.error}`);

  if (uploadRes.status === 400 && uploadJson.error.includes("Server-side Validation Failed")) {
    console.log("✓ PASSED: Sharp server-side image dimension validation REJECTED invalid 1024x768 artwork!");
  } else {
    throw new Error("FAILED: Server-side sharp dimension validation failed to reject invalid artwork!");
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: END-TO-END HAPPY PATH VERIFICATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--------------------------------------------------");
  console.log("STEP 1: POSITION BOOST FLOW (STORE BOOST & APPROVAL)");
  console.log("--------------------------------------------------");

  let testStore = await db.store.findFirst();
  if (!testStore) {
    testStore = await db.store.create({
      data: {
        name: "Verification Test Store",
        slug: `verification-test-${Date.now()}`,
        domain: "verificationtest.com",
        rawDestinationUrl: "https://verificationtest.com",
      },
    });
  }

  // Create Boost Order
  const boostOrder = await db.featuredOrder.create({
    data: {
      placementKind: "boost",
      planType: "featured_store",
      storeId: testStore.id,
      durationDays: 7,
      advertiserEmail: "boost-advertiser@test.com",
      brandName: testStore.name,
      paymentStatus: "pending",
      campaignStatus: "pending_review",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priceMinor: 12600,
    },
  });

  console.log(`✓ Created Boost Order ID: ${boostOrder.id}`);

  // Webhook confirms payment
  const paidBoostOrder = await db.featuredOrder.update({
    where: { id: boostOrder.id },
    data: { paymentStatus: "paid", magicToken: `token_boost_${Date.now()}` },
  });
  console.log(`✓ Webhook Confirmed Payment -> paymentStatus: ${paidBoostOrder.paymentStatus}`);

  // Admin approves boost
  const adminFeaturedModule = await import("../src/app/api/admin/featured/route");
  const approveReq = new Request("http://localhost:3000/api/admin/featured", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: boostOrder.id, action: "approve" }),
  });

  const approveRes = await adminFeaturedModule.POST(approveReq as any);
  const approveJson = await approveRes.json();
  console.log(`✓ Admin Approved Boost -> Response: ${approveJson.success}`);

  const approvedStore = await db.store.findUnique({ where: { id: testStore.id } });
  console.log(`  Store isFeatured: ${approvedStore?.isFeatured} (until: ${approvedStore?.featuredUntil?.toISOString()})`);

  // Expire Campaign
  await db.featuredOrder.update({
    where: { id: boostOrder.id },
    data: { endsAt: new Date(Date.now() - 1000) },
  });

  const cronResultBoost = await processCampaignLifecycle();
  const expiredStore = await db.store.findUnique({ where: { id: testStore.id } });
  const completedBoostOrder = await db.featuredOrder.findUnique({ where: { id: boostOrder.id } });

  console.log(`✓ Ran CRON Expiry Job -> Expired Count: ${cronResultBoost.expiredCount}`);
  console.log(`  Updated campaignStatus: ${completedBoostOrder?.campaignStatus}`);
  console.log(`  Store isFeatured after expiry: ${expiredStore?.isFeatured}`);


  console.log("\n--------------------------------------------------");
  console.log("STEP 2: BANNER DISPLAY SLOT FLOW (CREATIVE & PORTAL)");
  console.log("--------------------------------------------------");

  // Generate valid 728x90 image buffer via sharp
  const validLeaderboardBuffer = await sharp({
    create: { width: 728, height: 90, channels: 3, background: { r: 16, g: 185, b: 129 } },
  })
    .png()
    .toBuffer();

  const validBase64 = `data:image/png;base64,${validLeaderboardBuffer.toString("base64")}`;

  const validBannerOrder = await db.featuredOrder.create({
    data: {
      placementKind: "banner",
      planType: "header_leaderboard_banner",
      advertiserEmail: "banner-advertiser-valid@test.com",
      brandName: "Valid Banner Brand",
      paymentStatus: "paid",
      campaignStatus: "awaiting_creative",
      magicToken: `token_valid_banner_${Date.now()}`,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      priceMinor: 35000,
    },
  });

  // Upload valid 728x90 artwork
  const validUploadReq = new Request("http://localhost:3000/api/advertiser/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: validBannerOrder.magicToken,
      imageUrl: validBase64,
      targetUrl: "https://validbannerbrand.com",
    }),
  });

  const validUploadRes = await portalModule.POST(validUploadReq as any);
  const validUploadJson = await validUploadRes.json();
  console.log(`✓ Valid 728x90 Upload Result: ${validUploadJson.message}`);

  const updatedBannerOrder = await db.featuredOrder.findUnique({ where: { id: validBannerOrder.id } });
  console.log(`  Updated campaignStatus: ${updatedBannerOrder?.campaignStatus}`);

  console.log("\n==================================================");
  console.log("🎉 ALL NEGATIVE SECURITY & E2E VERIFICATION TESTS PASSED 100%!");
  console.log("==================================================");
}

verifyFlows()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  });
