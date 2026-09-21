#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Rotate database credentials everywhere
#
# Run this AFTER resetting the neondb_owner password in the Neon console.
# It prompts for the new connection strings (never echoed), updates
# .env / .env.local, pushes the new values to Vercel production, and
# triggers a production redeploy.
#
# Prereqs:  vercel login   &&   vercel link   (run once, in this folder)
# Usage:    bash scripts/rotate-db-credentials.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .vercel/project.json ]; then
  echo "✗ This folder is not linked to a Vercel project. Run: vercel link" >&2
  exit 1
fi

read -rsp "Paste NEW pooled connection string (Neon → Connect → Pooled): " NEW_POOLED; echo
read -rsp "Paste NEW direct/unpooled connection string (Neon → Connect → uncheck Pooled): " NEW_DIRECT; echo

# postgresql://USER:PASSWORD@HOST/db?...  → extract PASSWORD and HOSTs
NEW_PASS="$(printf '%s' "$NEW_POOLED" | sed -E 's#^[a-z]+://[^:]+:([^@]+)@.*#\1#')"
NEW_HOST_POOLED="$(printf '%s' "$NEW_POOLED" | sed -E 's#^[a-z]+://[^@]+@([^/?]+).*#\1#')"
NEW_HOST_DIRECT="$(printf '%s' "$NEW_DIRECT" | sed -E 's#^[a-z]+://[^@]+@([^/?]+).*#\1#')"
[ -n "$NEW_PASS" ] && [ "$NEW_PASS" != "$NEW_POOLED" ] || { echo "✗ Could not parse password from connection string" >&2; exit 1; }

OLD_PASS="$(grep -E '^PGPASSWORD=' .env | sed -E 's/^PGPASSWORD="?([^"]*)"?/\1/')"
[ -n "$OLD_PASS" ] || { echo "✗ Could not read current PGPASSWORD from .env" >&2; exit 1; }
if [ "$OLD_PASS" = "$NEW_PASS" ]; then
  echo "→ .env already contains this password (resuming a previous run) — skipping file update"
else
echo "→ Updating .env and .env.local"
for f in .env .env.local; do
  [ -f "$f" ] || continue
  cp "$f" "$f.bak.$(date +%Y%m%d%H%M%S)"
  # Escape sed-replacement metacharacters (& # \) — Neon URLs contain '&'.
  esc() { printf '%s' "$1" | sed -e 's/[&#\\]/\\&/g'; }
  sed -i '' \
    -e "s#$(esc "$OLD_PASS")#$(esc "$NEW_PASS")#g" \
    -e "s#^DATABASE_URL=.*#DATABASE_URL=\"$(esc "$NEW_POOLED")\"#" \
    -e "s#^POSTGRES_PRISMA_URL=.*#POSTGRES_PRISMA_URL=\"$(esc "$NEW_POOLED")\"#" \
    -e "s#^POSTGRES_URL=.*#POSTGRES_URL=\"$(esc "$NEW_POOLED")\"#" \
    -e "s#^DATABASE_URL_UNPOOLED=.*#DATABASE_URL_UNPOOLED=\"$(esc "$NEW_DIRECT")\"#" \
    -e "s#^POSTGRES_URL_NON_POOLING=.*#POSTGRES_URL_NON_POOLING=\"$(esc "$NEW_DIRECT")\"#" \
    -e "s#^PGHOST=.*#PGHOST=\"$(esc "$NEW_HOST_POOLED")\"#" \
    -e "s#^POSTGRES_HOST=.*#POSTGRES_HOST=\"$(esc "$NEW_HOST_POOLED")\"#" \
    -e "s#^PGHOST_UNPOOLED=.*#PGHOST_UNPOOLED=\"$(esc "$NEW_HOST_DIRECT")\"#" \
    "$f"
done
fi

echo "→ Verifying the new credentials work"
npx prisma db execute --url "$NEW_POOLED" --stdin <<<'SELECT 1;' >/dev/null

echo "→ Pushing to Vercel (production)"
VARS=(DATABASE_URL DATABASE_URL_UNPOOLED POSTGRES_PRISMA_URL POSTGRES_URL_NON_POOLING POSTGRES_URL PGPASSWORD POSTGRES_PASSWORD PGHOST PGHOST_UNPOOLED POSTGRES_HOST)
for v in "${VARS[@]}"; do
  val="$(grep -E "^${v}=" .env | sed -E "s/^${v}=\"?([^\"]*)\"?/\1/")"
  [ -n "$val" ] || continue
  vercel env rm "$v" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | vercel env add "$v" production >/dev/null
  echo "   ✓ $v"
done

echo "→ Redeploying production"
vercel --prod --yes

echo
echo "✓ Done. Old credentials are no longer valid anywhere."
echo "  Delete the .env*.bak.* files once you've confirmed the site works."
