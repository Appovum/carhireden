// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Key-Value System Settings Manager
// Route: GET/POST /api/admin/settings
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";

export async function GET() {
  const settings = await db.setting.findMany();
  const result: Record<string, any> = {};

  settings.forEach((s) => {
    let val = JSON.parse(s.valueJson);
    if (s.isEncrypted && typeof val === "string") {
      val = decryptSecret(val);
    }
    result[s.key] = val;
  });

  return NextResponse.json({ settings: result });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, value, category = "general", isEncrypted = false } = body;

  if (!key) {
    return NextResponse.json({ error: "Missing setting key." }, { status: 400 });
  }

  let finalVal = value;
  if (isEncrypted && typeof value === "string") {
    finalVal = encryptSecret(value);
  }

  const setting = await db.setting.upsert({
    where: { key },
    update: {
      valueJson: JSON.stringify(finalVal),
      category,
      isEncrypted,
    },
    create: {
      key,
      valueJson: JSON.stringify(finalVal),
      category,
      isEncrypted,
    },
  });

  return NextResponse.json({ setting });
}
