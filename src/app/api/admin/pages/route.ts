// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin API: Content & Legal Pages Manager
// Route: GET/POST /api/admin/pages
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_PAGES } from "@/lib/constants/defaultPages";


export async function GET() {
  try {
    const keys = ["page_about", "page_contact", "page_privacy", "page_terms", "contact_messages"];
    const dbSettings = await db.setting.findMany({
      where: { key: { in: keys } },
    });

    const settingsMap: Record<string, any> = {};
    dbSettings.forEach((s) => {
      try {
        settingsMap[s.key] = JSON.parse(s.valueJson);
      } catch {
        settingsMap[s.key] = s.valueJson;
      }
    });

    const pages = {
      about: settingsMap["page_about"] || DEFAULT_PAGES.about,
      contact: settingsMap["page_contact"] || DEFAULT_PAGES.contact,
      privacy: settingsMap["page_privacy"] || DEFAULT_PAGES.privacy,
      terms: settingsMap["page_terms"] || DEFAULT_PAGES.terms,
    };

    const messages = settingsMap["contact_messages"] || [];

    return NextResponse.json({ pages, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load pages." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageKey, data, action, messageId } = body;

    // Handle deleting a message
    if (action === "delete_message" && messageId) {
      const dbSetting = await db.setting.findUnique({ where: { key: "contact_messages" } });
      let messages: any[] = dbSetting ? JSON.parse(dbSetting.valueJson) : [];
      messages = messages.filter((m) => m.id !== messageId);

      await db.setting.upsert({
        where: { key: "contact_messages" },
        update: { valueJson: JSON.stringify(messages), category: "contact" },
        create: { key: "contact_messages", valueJson: JSON.stringify(messages), category: "contact" },
      });

      return NextResponse.json({ success: true, messages });
    }

    if (!pageKey || !data) {
      return NextResponse.json({ error: "Missing pageKey or data." }, { status: 400 });
    }

    const validKeys = ["about", "contact", "privacy", "terms"];
    if (!validKeys.includes(pageKey)) {
      return NextResponse.json({ error: "Invalid page key." }, { status: 400 });
    }

    const settingKey = `page_${pageKey}`;

    const updated = await db.setting.upsert({
      where: { key: settingKey },
      update: {
        valueJson: JSON.stringify(data),
        category: "pages",
      },
      create: {
        key: settingKey,
        valueJson: JSON.stringify(data),
        category: "pages",
      },
    });

    return NextResponse.json({ success: true, pageKey, data: JSON.parse(updated.valueJson) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save page settings." }, { status: 500 });
  }
}
