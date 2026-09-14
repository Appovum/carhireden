// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Network Credential Test Button Endpoint
// Route: POST /api/admin/networks/[id]/test
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { decryptSecret } from "@/lib/security/crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Find network by id or slug (e.g. "cj" / "awin")
  let network = await db.network.findUnique({
    where: { id },
  });

  if (!network) {
    network = await db.network.findFirst({
      where: { slug: id },
    });
  }

  if (!network) {
    return NextResponse.json({ success: false, message: "Network not found." }, { status: 404 });
  }

  const connector = getConnector(network.slug);
  if (!connector) {
    return NextResponse.json(
      { success: false, message: `No connector registered for slug: ${network.slug}` },
      { status: 400 }
    );
  }

  // Use credentials passed in body (as body.credentials or body), or decrypt stored credentials
  let credentials = body.credentials || (body.apiKey || body.publisherId ? body : null);

  if (!credentials || Object.keys(credentials).length === 0) {
    if (network.apiCredentialsEncrypted) {
      try {
        const raw = network.apiCredentialsEncrypted;
        const decrypted = typeof raw === "string" ? decryptSecret(raw) : raw;
        credentials = typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
      } catch (err: any) {
        console.error("Failed to parse network credentials:", err);
        credentials = {};
      }
    }
  }

  if (!credentials) credentials = {};

  try {
    const result = await connector.testCredentials(credentials);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to test credentials." },
      { status: 500 }
    );
  }
}
