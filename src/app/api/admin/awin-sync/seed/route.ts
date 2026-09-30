// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Awin Network Seed Route
// POST /api/admin/awin-sync/seed
// One-time setup: creates the Awin Network + ImportSource records.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getNetworkCredentials,
  missingCredentialFields,
  serializeCredentials,
} from "@/lib/connectors/credentials";

export async function POST() {
  // Admin → Networks first, .env as fallback.
  const credentials = await getNetworkCredentials("awin");
  const missing = missingCredentialFields("awin", credentials);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Awin ${missing.join(" and ")} missing. Add them in Admin → Networks, or set AWIN_API_KEY and AWIN_PUBLISHER_ID in .env.`,
      },
      { status: 400 }
    );
  }

  const publisherId = credentials.publisherId as string;

  try {
    // Upsert Awin Network record. The update branch deliberately leaves
    // apiCredentialsEncrypted alone so it never overwrites credentials the
    // admin saved in the panel.
    const network = await db.network.upsert({
      where: { slug: "awin" },
      update: {
        isEnabled: true,
      },
      create: {
        name: "Awin",
        slug: "awin",
        isEnabled: true,
        linkTemplate: "https://www.awin1.com/cread.php?awinmid={advertiserId}&awinaffid={publisherId}&ued={destinationUrl}&clickref={subId}",
        apiCredentialsEncrypted: serializeCredentials(credentials),
      },
    });

    // Upsert Awin ImportSource record
    const existingSource = await db.importSource.findFirst({
      where: { networkId: network.id, name: "Awin Promotions Feed" },
    });

    let importSource;
    if (existingSource) {
      importSource = await db.importSource.update({
        where: { id: existingSource.id },
        data: { autoSync: true },
      });
    } else {
      importSource = await db.importSource.create({
        data: {
          networkId: network.id,
          name: "Awin Promotions Feed",
          autoSync: true,
        },
      });
    }

    // Log to Audit
    await db.auditLog.create({
      data: {
        action: "awin_network_seed",
        resource: "network",
        resourceId: network.id,
        detailsJson: JSON.stringify({
          networkId: network.id,
          importSourceId: importSource.id,
          publisherId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      networkId: network.id,
      importSourceId: importSource.id,
      message: `Awin network seeded. Publisher ID: ${publisherId}`,
    });
  } catch (error: any) {
    console.error("Awin seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed Awin network" },
      { status: 500 }
    );
  }
}
