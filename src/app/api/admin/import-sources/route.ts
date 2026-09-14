// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Import Sources API Route
// Route: GET/POST /api/admin/import-sources
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // 1. Ensure default network records exist in DB
    let cjNet = await db.network.findUnique({ where: { slug: "cj" } });
    if (!cjNet) {
      cjNet = await db.network.create({
        data: {
          name: "CJ Affiliate",
          slug: "cj",
          isEnabled: true,
          linkTemplate: "append_subid",
        },
      });
    }

    let awinNet = await db.network.findUnique({ where: { slug: "awin" } });
    if (!awinNet) {
      awinNet = await db.network.create({
        data: {
          name: "Awin Network",
          slug: "awin",
          isEnabled: true,
          linkTemplate: "template",
        },
      });
    }

    // 2. Ensure default ImportSource feed entries exist in DB for CJ and Awin
    await db.importSource.upsert({
      where: { id: "cj_feed_source" },
      update: {},
      create: {
        id: "cj_feed_source",
        networkId: cjNet.id,
        name: "CJ Advertisers & Link Search Feed",
        autoSync: true,
      },
    });

    await db.importSource.upsert({
      where: { id: "awin_feed_source" },
      update: {},
      create: {
        id: "awin_feed_source",
        networkId: awinNet.id,
        name: "Awin Promotions & Offers Feed",
        autoSync: true,
      },
    });

    // 3. Query all networks and import sources with latest runs
    const networks = await db.network.findMany({
      include: {
        importSources: {
          include: {
            importRuns: { orderBy: { startedAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const sources = await db.importSource.findMany({
      include: {
        network: true,
        importRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedNetworks = networks.map((net) => {
      const primarySource = net.importSources[0];
      const lastRun = primarySource?.importRuns[0];
      const lastSyncedAt = primarySource?.lastSyncedAt || net.updatedAt;

      return {
        id: net.id,
        name: net.name,
        slug: net.slug,
        isEnabled: net.isEnabled,
        status: lastRun ? lastRun.status : net.isEnabled ? "healthy" : "disabled",
        lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
      };
    });

    const formattedSources = sources.map((src) => {
      const lastRun = src.importRuns[0];
      return {
        id: src.id,
        name: src.name,
        networkName: src.network ? src.network.name : "Custom Feed",
        status: lastRun ? lastRun.status : "active",
        lastRun: src.lastSyncedAt ? src.lastSyncedAt.toISOString().slice(0, 16).replace("T", " ") : "Never",
        lastSyncedAt: src.lastSyncedAt ? src.lastSyncedAt.toISOString() : null,
        addedCount: lastRun ? lastRun.itemsInserted : 0,
        updatedCount: lastRun ? lastRun.itemsUpdated : 0,
        skippedCount: lastRun ? Math.max(0, lastRun.itemsProcessed - lastRun.itemsInserted - lastRun.itemsUpdated) : 0,
        failedCount: lastRun ? lastRun.itemsFailed : 0,
      };
    });

    return NextResponse.json({
      success: true,
      networks: formattedNetworks,
      sources: formattedSources,
    });
  } catch (error) {
    console.error("Import Sources GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch import sources" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json({ success: false, error: "sourceId is required" }, { status: 400 });
    }

    const source = await db.importSource.findUnique({
      where: { id: sourceId },
      include: { network: true },
    });

    if (!source) {
      return NextResponse.json({ success: false, error: "Import source not found" }, { status: 404 });
    }

    // Create a new import run entry
    const run = await db.importRun.create({
      data: {
        importSourceId: sourceId,
        status: "running",
        startedAt: new Date(),
      },
    });

    const syncStats = { itemsProcessed: 0, itemsInserted: 0, itemsUpdated: 0, itemsFailed: 0 };

    if (source.network?.slug === "cj" || source.name.toLowerCase().includes("cj")) {
      const cjRes = await fetch(new URL("/api/admin/cj-sync", req.url).toString(), { method: "POST" });
      const cjData = await cjRes.json();
      if (cjData.success) {
        syncStats.itemsInserted = (cjData.storesImported || 0) + (cjData.couponsImported || 0);
        syncStats.itemsUpdated = (cjData.storesUpdated || 0) + (cjData.couponsUpdated || 0);
        syncStats.itemsProcessed = syncStats.itemsInserted + syncStats.itemsUpdated;
      }
    } else if (source.network?.slug === "awin" || source.name.toLowerCase().includes("awin")) {
      const awinRes = await fetch(new URL("/api/admin/awin-sync", req.url).toString(), { method: "POST" });
      const awinData = await awinRes.json();
      if (awinData.success) {
        syncStats.itemsInserted = (awinData.storesImported || 0) + (awinData.joinedOffersCount || 0);
        syncStats.itemsUpdated = (awinData.storesUpdated || 0) + (awinData.unjoinedOffersCount || 0);
        syncStats.itemsProcessed = syncStats.itemsInserted + syncStats.itemsUpdated;
      }
    }

    // Complete run record
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        itemsProcessed: syncStats.itemsProcessed,
        itemsInserted: syncStats.itemsInserted,
        itemsUpdated: syncStats.itemsUpdated,
        itemsFailed: syncStats.itemsFailed,
      },
    });

    // Update lastSyncedAt timestamp on ImportSource
    await db.importSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true, runId: run.id, stats: syncStats });
  } catch (error: any) {
    console.error("Import Sources POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to trigger import run" }, { status: 500 });
  }
}
