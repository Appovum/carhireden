// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin i18n & Translation Management API Route
// Route: GET/POST/PUT/DELETE /api/admin/i18n
// Manages dynamic UI translation strings, language catalogs, and key-value overrides.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guards";
import { DEFAULT_TRANSLATIONS, mergeCatalog, type TranslationItem } from "@/lib/i18n/catalog";

async function getStoredTranslations(): Promise<TranslationItem[]> {
  const setting = await db.setting.findUnique({
    where: { key: "i18n_catalog" },
  });

  if (!setting) {
    await db.setting.create({
      data: {
        key: "i18n_catalog",
        valueJson: JSON.stringify(DEFAULT_TRANSLATIONS),
        category: "i18n",
      },
    });
    return DEFAULT_TRANSLATIONS;
  }

  try {
    const finalCatalog = mergeCatalog(JSON.parse(setting.valueJson));

    await db.setting.update({
      where: { key: "i18n_catalog" },
      data: { valueJson: JSON.stringify(finalCatalog) },
    });

    return finalCatalog;
  } catch {
    return DEFAULT_TRANSLATIONS;
  }
}

async function saveStoredTranslations(catalog: TranslationItem[]): Promise<void> {
  await db.setting.upsert({
    where: { key: "i18n_catalog" },
    create: {
      key: "i18n_catalog",
      valueJson: JSON.stringify(catalog),
      category: "i18n",
    },
    update: {
      valueJson: JSON.stringify(catalog),
    },
  });
}

// GET /api/admin/i18n
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const catalog = await getStoredTranslations();
    return NextResponse.json({ success: true, translations: catalog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/i18n (Create new key)
export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { key, category, en, es, fr, de, hi } = body;

    if (!key || !en) {
      return NextResponse.json({ success: false, message: "Translation key and default English text are required." }, { status: 400 });
    }

    const catalog = await getStoredTranslations();
    const existingIndex = catalog.findIndex((item) => item.key.toLowerCase() === key.toLowerCase());

    const newItem: TranslationItem = {
      id: existingIndex >= 0 ? catalog[existingIndex].id : `tr_${Date.now()}`,
      key: key.trim(),
      category: category || key.split(".")[0] || "general",
      en: en.trim(),
      es: es ? es.trim() : "",
      fr: fr ? fr.trim() : "",
      de: de ? de.trim() : "",
      hi: hi ? hi.trim() : "",
    };

    if (existingIndex >= 0) {
      catalog[existingIndex] = newItem;
    } else {
      catalog.unshift(newItem);
    }

    await saveStoredTranslations(catalog);
    return NextResponse.json({ success: true, item: newItem, translations: catalog });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/i18n (Update translation item)
export async function PUT(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { id, key, category, en, es, fr, de, hi } = body;

    if (!id && !key) {
      return NextResponse.json({ success: false, message: "Translation ID or key required." }, { status: 400 });
    }

    const catalog = await getStoredTranslations();
    const index = catalog.findIndex((item) => item.id === id || item.key === key);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Translation item not found." }, { status: 404 });
    }

    catalog[index] = {
      ...catalog[index],
      category: category !== undefined ? category : catalog[index].category,
      en: en !== undefined ? en : catalog[index].en,
      es: es !== undefined ? es : catalog[index].es,
      fr: fr !== undefined ? fr : catalog[index].fr,
      de: de !== undefined ? de : catalog[index].de,
      hi: hi !== undefined ? hi : catalog[index].hi,
    };

    await saveStoredTranslations(catalog);
    return NextResponse.json({ success: true, item: catalog[index], translations: catalog });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/i18n (Delete key)
export async function DELETE(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Translation ID required." }, { status: 400 });
    }

    let catalog = await getStoredTranslations();
    catalog = catalog.filter((item) => item.id !== id);

    await saveStoredTranslations(catalog);
    return NextResponse.json({ success: true, translations: catalog });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
