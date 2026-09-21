#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Provision a customer database with schema + catalog data
#
# NON-DESTRUCTIVE. Creates any missing tables (never drops), then seeds
# categories, networks, 200 stores, 10,000 coupons and the default ad
# slots using upserts. Never touches users, passwords, or settings the
# customer has already saved.
#
# Usage:
#   DATABASE_URL='postgresql://user:pass@host/db?sslmode=require' \
#     bash scripts/provision-database.sh
#
# After it finishes, if the database has no admin yet, the customer opens
# https://<their-site>/install once to create their own admin login.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

[ -n "${DATABASE_URL:-}" ] || { echo "✗ Set DATABASE_URL first (see usage at top of this script)." >&2; exit 1; }
# Prisma's directUrl is only used for schema changes; Neon's direct host is the pooled host minus "-pooler".
export DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-${DATABASE_URL/-pooler/}}"

HOST="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*@([^/?]+).*#\1#')"
echo "Target: $HOST"

echo "→ Creating missing tables (no data is dropped)"
npx prisma db push --skip-generate

echo "→ Seeding categories, networks, stores and coupons (upsert)"
npx tsx scripts/seed-catalog.ts

echo "→ Ensuring default ad slots exist"
node -e '
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  for (const positionSlug of ["header_top", "sidebar_right", "footer_bottom"]) {
    await db.adSlot.upsert({
      where: { positionSlug },
      update: {},
      create: {
        name: positionSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Slot",
        positionSlug,
      },
    });
  }
  const [users, admins, stores, coupons, categories] = await Promise.all([
    db.user.count(), db.user.count({ where: { role: "admin" } }), db.store.count(), db.coupon.count(), db.category.count(),
  ]);
  console.log(`\n✓ Done. stores=${stores} coupons=${coupons} categories=${categories} users=${users}`);
  if (admins === 0) {
    console.log("  No admin account exists yet — open /install on the site once to create one.");
  } else {
    console.log("  Existing accounts were left untouched.");
  }
  await db.$disconnect();
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
'
