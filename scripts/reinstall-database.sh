#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Wipe the database and reinstall from scratch
#
# DESTRUCTIVE: drops every table in the database that DATABASE_URL in
# .env points to, then recreates the schema, admin account, settings,
# default ad slots, and the demo catalog.
#
# Usage:  bash scripts/reinstall-database.sh
#   Optional: ADMIN_EMAIL=you@example.com bash scripts/reinstall-database.sh
#   A random admin password is generated and printed once at the end.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="$(grep -E '^DATABASE_URL=' .env | sed -E 's#.*@([^/?]+).*#\1#')"
echo "This will ERASE ALL DATA in: $HOST"
read -rp "Type 'erase' to continue: " CONFIRM
[ "$CONFIRM" = "erase" ] || { echo "Aborted."; exit 1; }

echo "→ Dropping and recreating schema"
npx prisma db push --force-reset --accept-data-loss

echo "→ Reinstalling admin, settings, ad slots, and catalog"
node --env-file=.env --import tsx scripts/reinstall.ts
