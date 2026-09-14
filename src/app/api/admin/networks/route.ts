// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Affiliate Networks API Route
// Route: GET/POST /api/admin/networks
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/security/crypto";

export async function GET() {
  try {
    const rawNetworks = await db.network.findMany({
      orderBy: { name: "asc" },
    });

    const networks = rawNetworks.map((net) => {
      let parsedCreds: any = {};
      if (net.apiCredentialsEncrypted) {
        try {
          const decrypted = decryptSecret(net.apiCredentialsEncrypted);
          parsedCreds = JSON.parse(decrypted);
        } catch {
          parsedCreds = {};
        }
      }

      // Fall back to environment variables for publisher IDs if not in DB
      let publisherId = parsedCreds.publisherId || parsedCreds.affiliateId || null;
      if (!publisherId) {
        if (net.slug === "cj") publisherId = process.env.CJ_PUBLISHER_ID || null;
        if (net.slug === "awin") publisherId = process.env.AWIN_PUBLISHER_ID || null;
      }

      return {
        ...net,
        publisherId,
      };
    });

    return NextResponse.json({ success: true, networks });
  } catch (error) {
    console.error("Networks GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch networks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, isEnabled, linkTemplate, apiCredentialsEncrypted } = body;

    if (id) {
      const updated = await db.network.update({
        where: { id },
        data: {
          isEnabled,
          linkTemplate,
          apiCredentialsEncrypted,
        },
      });
      return NextResponse.json({ success: true, network: updated });
    }

    const created = await db.network.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        isEnabled: isEnabled !== false,
        linkTemplate: linkTemplate || "https://example.com/click?url={destinationUrl}&subId={subId}",
        apiCredentialsEncrypted,
      },
    });

    return NextResponse.json({ success: true, network: created });
  } catch (error) {
    console.error("Networks POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to save network" }, { status: 500 });
  }
}
