// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public translation strings
// Route: GET /api/i18n
//
// Read-only. The site's UI text and its translations, loaded by every page
// (see context/LanguageContext.tsx). Editing stays in /api/admin/i18n, which
// requires an administrator. Before 1.0.7 visitors loaded this from the admin
// route, so it only worked for people who happened to have a cookie.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/i18n/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const translations = await readCatalog();
    return NextResponse.json(
      { success: true, translations },
      // admins' edits show up within a minute
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("[I18N] Could not load the translation catalog:", error);
    return NextResponse.json({ success: false, translations: [] }, { status: 500 });
  }
}
