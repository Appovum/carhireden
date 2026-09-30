// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Affiliate Networks API Route
// Route: GET/POST /api/admin/networks
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardDemoMode } from "@/lib/demo";
import {
  getNetworkCredentials,
  missingCredentialFields,
  parseStoredCredentials,
  serializeCredentials,
} from "@/lib/connectors/credentials";

export async function GET() {
  try {
    const rawNetworks = await db.network.findMany({
      orderBy: { name: "asc" },
    });

    const networks = await Promise.all(
      rawNetworks.map(async (net) => {
        // Resolved view (DB first, env fallback) so the admin UI shows what
        // the connectors will actually use.
        const creds = await getNetworkCredentials(net.slug);
        const stored = parseStoredCredentials(net.apiCredentialsEncrypted);
        const missing = missingCredentialFields(net.slug, creds);
        const secret = creds.accessToken || creds.apiKey || "";

        return {
          ...net,
          // Never send the secret itself to the browser — only whether one
          // exists and its last 4 characters so the admin can identify it.
          apiCredentialsEncrypted: undefined,
          publisherId: creds.publisherId || creds.affiliateId || "",
          hasSecret: Boolean(secret),
          secretHint: secret ? `••••${secret.slice(-4)}` : "",
          // Where each value came from, so the UI can explain itself.
          source: Object.keys(stored).length > 0 ? "database" : secret || creds.publisherId ? "env" : "none",
          isConfigured: missing.length === 0,
          missingFields: missing,
        };
      })
    );

    return NextResponse.json({ success: true, networks });
  } catch (error) {
    console.error("Networks GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch networks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const demoBlocked = guardDemoMode();
  if (demoBlocked) return demoBlocked;

  try {
    const body = await req.json();
    const { id, slug, name, isEnabled, linkTemplate, publisherId, apiKey } = body;

    // Locate the target network by id or slug.
    let network = null;
    if (id) network = await db.network.findUnique({ where: { id } });
    if (!network && slug) network = await db.network.findFirst({ where: { slug } });

    if (!network && !name && !slug) {
      return NextResponse.json(
        { success: false, error: "A network id, slug, or name is required." },
        { status: 400 }
      );
    }

    // Merge credentials onto whatever is already stored, then encrypt here —
    // the browser never sends or receives ciphertext.
    const buildCredentials = (existingEncrypted: string | null) => {
      const existing = parseStoredCredentials(existingEncrypted);
      const next = { ...existing };
      const targetSlug = network?.slug || slug || "";

      if (typeof publisherId === "string" && publisherId.trim()) {
        next.publisherId = publisherId.trim();
        next.affiliateId = publisherId.trim();
        if (targetSlug === "cj") next.websiteId = publisherId.trim();
      }
      // An empty/absent apiKey means "leave the stored secret alone", so the
      // admin can update the publisher ID without re-entering the token.
      if (typeof apiKey === "string" && apiKey.trim()) {
        next.apiKey = apiKey.trim();
        if (targetSlug === "cj") next.accessToken = apiKey.trim();
      }

      return Object.keys(next).length > 0 ? serializeCredentials(next) : null;
    };

    if (network) {
      const updated = await db.network.update({
        where: { id: network.id },
        data: {
          ...(isEnabled !== undefined ? { isEnabled } : {}),
          ...(linkTemplate !== undefined ? { linkTemplate } : {}),
          apiCredentialsEncrypted: buildCredentials(network.apiCredentialsEncrypted),
        },
      });

      const creds = await getNetworkCredentials(updated.slug);
      return NextResponse.json({
        success: true,
        network: { ...updated, apiCredentialsEncrypted: undefined },
        isConfigured: missingCredentialFields(updated.slug, creds).length === 0,
        missingFields: missingCredentialFields(updated.slug, creds),
      });
    }

    const created = await db.network.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        isEnabled: isEnabled !== false,
        linkTemplate: linkTemplate || "https://example.com/click?url={destinationUrl}&subId={subId}",
        apiCredentialsEncrypted: buildCredentials(null),
      },
    });

    return NextResponse.json({
      success: true,
      network: { ...created, apiCredentialsEncrypted: undefined },
    });
  } catch (error) {
    console.error("Networks POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to save network" }, { status: 500 });
  }
}
