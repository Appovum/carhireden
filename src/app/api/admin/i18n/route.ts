// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin i18n & Translation Management API Route
// Route: GET/POST/PUT/DELETE /api/admin/i18n
// Manages dynamic UI translation strings, language catalogs, and key-value overrides.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface TranslationItem {
  id: string;
  key: string;
  category: string; // e.g. "header", "wallet", "store", "checkout"
  en: string; // Default English text
  es?: string; // Spanish translation
  fr?: string; // French translation
  de?: string; // German translation
  hi?: string; // Hindi translation
}

const DEFAULT_TRANSLATIONS: TranslationItem[] = [
  // Header & Nav
  { id: "tr_1", key: "header.search_placeholder", category: "header", en: "Search stores & coupons...", es: "Buscar tiendas y cupones...", fr: "Rechercher des magasins et des coupons...", de: "Geschäfte und Gutscheine suchen...", hi: "स्टोर और कूपन खोजें..." },
  { id: "tr_2", key: "header.cashback_balance", category: "header", en: "Cashback Balance", es: "Saldo de cashback", fr: "Solde de cashback", de: "Cashback-Guthaben", hi: "कैशबैक बैलेंस" },
  { id: "tr_3", key: "header.nav_stores", category: "header", en: "Stores", es: "Tiendas", fr: "Magasins", de: "Geschäfte", hi: "स्टोर" },
  { id: "tr_4", key: "header.nav_categories", category: "header", en: "Categories", es: "Categorías", fr: "Catégories", de: "Kategorien", hi: "श्रेणियां" },
  { id: "tr_5", key: "header.nav_advertise", category: "header", en: "Advertise", es: "Anunciar", fr: "Publier", de: "Werben", hi: "विज्ञापन दें" },
  { id: "tr_6", key: "header.nav_wallet", category: "header", en: "My Wallet", es: "Mi billetera", fr: "Mon portefeuille", de: "Mein Guthaben", hi: "मेरा वॉलेट" },
  { id: "tr_7", key: "header.nav_login", category: "header", en: "Sign in", es: "Iniciar sesión", fr: "Connexion", de: "Anmelden", hi: "साइन इन" },
  { id: "tr_8", key: "header.nav_signup", category: "header", en: "Sign up", es: "Registrarse", fr: "S'inscrire", de: "Registrieren", hi: "साइन अप" },

  // Hero & General
  { id: "tr_9", key: "hero.title", category: "hero", en: "Save Money & Earn Cashback on Every Purchase", es: "Ahorra dinero y gana cashback en cada compra", fr: "Économisez et gagnez du cashback sur chaque achat", de: "Geld sparen und Cashback bei jedem Einkauf verdienen", hi: "हर खरीदारी पर पैसे बचाएं और कैशबैक कमाएं" },
  { id: "tr_10", key: "hero.subtitle", category: "hero", en: "Verified promo codes and cash back offers from top online stores.", es: "Códigos promocionales verificados y ofertas de cashback de tiendas líderes.", fr: "Codes promo vérifiés et offres de cashback des meilleures boutiques en ligne.", de: "Verifizierte Gutscheincodes und Cashback-Angebote der besten Online-Shops.", hi: "शीर्ष ऑनलाइन स्टोरों से सत्यापित प्रोमो कोड और कैशबैक ऑफ़र।" },
  { id: "tr_11", key: "hero.featured_stores", category: "hero", en: "Featured Stores", es: "Tiendas destacadas", fr: "Boutiques en vedette", de: "Hervorgehobene Geschäfte", hi: "प्रमुख स्टोर" },
  { id: "tr_12", key: "hero.trending_offers", category: "hero", en: "Trending Deals & Promo Codes", es: "Ofertas y códigos promocionales populares", fr: "Offres et codes promo tendances", de: "Beliebte Angebote & Gutscheincodes", hi: "ट्रेंडिंग डील और प्रोमो कोड" },

  // Store & Coupons
  { id: "tr_13", key: "store.copy_code", category: "store", en: "Copy Code", es: "Copiar código", fr: "Copier le code", de: "Code kopieren", hi: "कोड कॉपी करें" },
  { id: "tr_14", key: "store.copied", category: "store", en: "Copied!", es: "¡Copiado!", fr: "Copié !", de: "Kopiert!", hi: "कॉपी किया गया!" },
  { id: "tr_15", key: "store.get_deal", category: "store", en: "Get Deal", es: "Obtener oferta", fr: "Obtenir l'offre", de: "Angebot sichern", hi: "डील प्राप्त करें" },
  { id: "tr_16", key: "store.verified_today", category: "store", en: "Verified Today", es: "Verificado hoy", fr: "Vérifié aujourd'hui", de: "Heute verifiziert", hi: "आज सत्यापित" },
  { id: "tr_17", key: "store.up_to_cashback", category: "store", en: "Up to Cashback", es: "Hasta en cashback", fr: "Jusqu'à de cashback", de: "Bis zu Cashback", hi: "तक कैशबैक" },
  { id: "tr_18", key: "store.expired", category: "store", en: "Expired Offer", es: "Oferta expirada", fr: "Offre expirée", de: "Abgelaufenes Angebot", hi: "समाप्त ऑफ़र" },

  // Cashback Wallet & History
  { id: "tr_19", key: "wallet.title", category: "wallet", en: "Your Cashback", es: "Tu cashback", fr: "Votre cashback", de: "Ihr Cashback", hi: "आपका कैशबैक" },
  { id: "tr_20", key: "wallet.withdraw_button", category: "wallet", en: "Withdraw earnings", es: "Retirar ganancias", fr: "Retirer les gains", de: "Guthaben auszahlen", hi: "कमाई निकालें" },
  { id: "tr_21", key: "wallet.total_earned", category: "wallet", en: "Total Earned", es: "Total ganado", fr: "Total gagné", de: "Gesamt verdient", hi: "कुल कमाई" },
  { id: "tr_22", key: "wallet.pending", category: "wallet", en: "Pending Balance", es: "Saldo pendiente", fr: "Solde en attente", de: "Ausstehendes Guthaben", hi: "बकाया बैलेंस" },
  { id: "tr_23", key: "wallet.confirmed", category: "wallet", en: "Confirmed Balance", es: "Saldo confirmado", fr: "Solde confirmé", de: "Bestätigtes Guthaben", hi: "पुष्टित बैलेंस" },
  { id: "tr_24", key: "wallet.paid_out", category: "wallet", en: "Paid Out", es: "Pagado", fr: "Payé", de: "Ausgezahlt", hi: "भुगतान किया गया" },

  // Withdrawals & Payouts
  { id: "tr_25", key: "withdraw.title", category: "withdraw", en: "Request Payout", es: "Solicitar pago", fr: "Demander un paiement", de: "Auszahlung anfordern", hi: "भुगतान का अनुरोध करें" },
  { id: "tr_26", key: "withdraw.min_payout_notice", category: "withdraw", en: "Minimum payout threshold applies", es: "Se aplica un umbral mínimo de pago", fr: "Le seuil de paiement minimum s'applique", de: "Mindestauszahlungsbetrag gilt", hi: "न्यूनतम भुगतान सीमा लागू होती है" },
  { id: "tr_27", key: "withdraw.paypal_label", category: "withdraw", en: "PayPal Account Email Address", es: "Correo electrónico de cuenta PayPal", fr: "Adresse e-mail du compte PayPal", de: "PayPal-Konto-E-Mail-Adresse", hi: "पेपाल खाता ईमेल पता" },
  { id: "tr_28", key: "withdraw.bank_label", category: "withdraw", en: "Bank Account Number / IBAN", es: "Número de cuenta bancaria / IBAN", fr: "Numéro de compte bancaire / IBAN", de: "Bankkontonummer / IBAN", hi: "बैंक खाता संख्या / IBAN" },
  { id: "tr_29", key: "withdraw.gift_card_label", category: "withdraw", en: "Amazon E-Gift Card Email", es: "Correo para tarjeta de regalo Amazon", fr: "E-mail pour carte cadeau Amazon", de: "E-Mail für Amazon-Geschenkgutschein", hi: "अमेज़न ई-गिफ्ट कार्ड ईमेल" },

  // Referrals
  { id: "tr_30", key: "referral.title", category: "referral", en: "Invite Friends & Earn Bonus", es: "Invita a amigos y gana bonos", fr: "Invitez des amis et gagnez un bonus", de: "Freunde einladen & Bonus verdienen", hi: "दोस्तों को आमंत्रित करें और बोनस कमाएं" },
  { id: "tr_31", key: "referral.share_link", category: "referral", en: "Share Your Unique Referral Link", es: "Comparte tu enlace de recomendación único", fr: "Partagez votre lien de parrainage unique", de: "Teilen Sie Ihren einzigartigen Empfehlungslink", hi: "अपना अनोखा रेफरल लिंक साझा करें" },
  { id: "tr_32", key: "referral.copy_link", category: "referral", en: "Copy Referral Link", es: "Copiar enlace de recomendación", fr: "Copier le lien de parrainage", de: "Empfehlungslink kopieren", hi: "रेफरल लिंक कॉपी करें" },

  // Advertiser Portal
  { id: "tr_33", key: "advertise.title", category: "advertise", en: "Advertise on CouponPilot", es: "Anúnciate en CouponPilot", fr: "Faites de la publicité sur CouponPilot", de: "Werben Sie auf CouponPilot", hi: "CouponPilot पर विज्ञापन दें" },
  { id: "tr_34", key: "advertise.subtitle", category: "advertise", en: "Promote your brand to thousands of high-intent shoppers.", es: "Promociona tu marca a miles de compradores.", fr: "Promouvez votre marque auprès de milliers d'acheteurs.", de: "Bewerben Sie Ihre Marke bei Tausenden von Käufern.", hi: "हजारों खरीदारी प्रेमियों के बीच अपने ब्रांड का प्रचार करें।" },
  { id: "tr_35", key: "advertise.select_placement", category: "advertise", en: "Select Placement Type", es: "Seleccionar tipo de ubicación", fr: "Sélectionner le type d'emplacement", de: "Platzierungstyp auswählen", hi: "प्लेसमेंट प्रकार चुनें" },
  { id: "tr_36", key: "advertise.upload_creative", category: "advertise", en: "Upload Banner Artwork", es: "Cargar arte del banner", fr: "Télécharger l'image de la bannière", de: "Banner-Design hochladen", hi: "बैनर आर्टवर्क अपलोड करें" },

  // Footer & Legal
  { id: "tr_37", key: "footer.rights_reserved", category: "footer", en: "All rights reserved.", es: "Todos los derechos reservados.", fr: "Tous droits réservés.", de: "Alle Rechte vorbehalten.", hi: "सर्वाधिकार सुरक्षित।" },
  { id: "tr_38", key: "footer.privacy_policy", category: "footer", en: "Privacy Policy", es: "Política de privacidad", fr: "Politique de confidentialité", de: "Datenschutz-Bestimmungen", hi: "गोपनीयता नीति" },
  { id: "tr_39", key: "footer.terms_of_service", category: "footer", en: "Terms of Service", es: "Términos de servicio", fr: "Conditions d'utilisation", de: "Nutzungsbedingungen", hi: "सेवा की शर्तें" },
  { id: "tr_40", key: "footer.contact_support", category: "footer", en: "Contact Support", es: "Contactar con soporte", fr: "Contacter le support", de: "Kundenservice kontaktieren", hi: "सहायता से संपर्क करें" },
];

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
    const parsed = JSON.parse(setting.valueJson);
    const existingList = Array.isArray(parsed) ? parsed : [];

    // Deduplicate keys & merge missing defaults
    const seenKeys = new Set<string>();
    const mergedList: TranslationItem[] = [];

    existingList.forEach((item: TranslationItem) => {
      if (item && item.key && !seenKeys.has(item.key)) {
        seenKeys.add(item.key);
        mergedList.push(item);
      }
    });

    DEFAULT_TRANSLATIONS.forEach((defItem) => {
      if (!seenKeys.has(defItem.key)) {
        seenKeys.add(defItem.key);
        mergedList.push(defItem);
      }
    });

    // Re-index all items to guarantee 100% unique IDs
    const finalCatalog = mergedList.map((item, idx) => ({
      ...item,
      id: `tr_${idx + 1}_${item.key.replace(/[^a-zA-Z0-9]/g, "_")}`,
    }));

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
  try {
    const catalog = await getStoredTranslations();
    return NextResponse.json({ success: true, translations: catalog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/i18n (Create new key)
export async function POST(req: Request) {
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
