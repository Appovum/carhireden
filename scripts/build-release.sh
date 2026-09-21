#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Build the CodeCanyon distribution zip
#
# Packages ONLY git-tracked files (so .env, node_modules, *.db, build
# caches and backups can never slip in), strips author-only files, then
# scans the result for secrets and refuses to build if any are found.
#
# Usage:  bash scripts/build-release.sh [version]     (default: 1.0.1)
# Output: dist/CouponPilot<version>.zip
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-1.0.1}"
NAME="CouponPilot${VERSION}"
STAGE="$(mktemp -d)/${NAME}"
OUT="dist/${NAME}.zip"
trap 'rm -rf "$(dirname "$STAGE")"' EXIT

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "✗ Uncommitted changes to tracked files — commit first so the zip matches a git revision." >&2
  exit 1
fi

echo "→ Exporting tracked files from $(git rev-parse --short HEAD)"
mkdir -p "$STAGE"
git archive --format=tar HEAD | tar -x -C "$STAGE"

echo "→ Removing author-only files"
rm -rf \
  "$STAGE/.claude" \
  "$STAGE/AGENTS.md" \
  "$STAGE/CLAUDE.md" \
  "$STAGE/to-do.md" \
  "$STAGE/couponpilot-preview-slides.html"
find "$STAGE" -name '.DS_Store' -delete

echo "→ Scanning for secrets"
# Anything matching these must never ship. Add to the list when new keys appear.
PATTERNS=(
  'npg_[A-Za-z0-9]'                 # Neon passwords
  'neon\.tech/'                     # Neon connection hosts (docs may link neon.tech, so require a path)
  'sk_(live|test)_[A-Za-z0-9]{8}'   # Stripe secret keys
  'pk_(live|test)_[A-Za-z0-9]{8}'   # Stripe publishable keys
  'whsec_[A-Za-z0-9]{8}'            # Stripe webhook secrets
  'AeDo[A-Za-z0-9_-]{20}'           # PayPal client id (previously leaked prefix)
  'EJCY[A-Za-z0-9_-]{20}'           # PayPal secret (previously leaked prefix)
  'AKIA[0-9A-Z]{16}'                # AWS access keys
  'ghp_[A-Za-z0-9]{20}'             # GitHub tokens
  'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'
  'leojwcusyscfbamd'                # previously leaked Gmail app password
  '3017873|8033258'                 # author's Awin / CJ publisher IDs (were hardcoded as fallbacks)
  'ratneshkumar|suchitrabsinha|hey-3420|web-buddy'   # author identifiers
)
HITS=0
SCAN=(grep -rInE --exclude=package-lock.json --exclude=build-release.sh)
for p in "${PATTERNS[@]}"; do
  if "${SCAN[@]}" "$p" "$STAGE" >/dev/null 2>&1; then
    echo "   ✗ pattern matched: $p"
    "${SCAN[@]}" "$p" "$STAGE" | sed -E "s#^$STAGE/##" | cut -c1-140 | head -5 | sed 's/^/     /'
    HITS=$((HITS + 1))
  fi
done
for f in .env .env.local .env.production; do
  [ -e "$STAGE/$f" ] && { echo "   ✗ $f present"; HITS=$((HITS + 1)); }
done
if find "$STAGE" \( -name '*.db' -o -name '*.bak*' -o -name '*.pem' -o -name '*.tsbuildinfo' \) | grep -q .; then
  echo "   ✗ database / backup / key files present:"; find "$STAGE" \( -name '*.db' -o -name '*.bak*' -o -name '*.pem' -o -name '*.tsbuildinfo' \) | sed 's/^/     /'
  HITS=$((HITS + 1))
fi
if [ "$HITS" -gt 0 ]; then
  echo "✗ Secret scan failed ($HITS issue(s)). Nothing was written." >&2
  exit 1
fi
echo "   ✓ clean"

echo "→ Zipping"
mkdir -p dist
rm -f "$OUT"
( cd "$(dirname "$STAGE")" && zip -r -X -q "$OLDPWD/$OUT" "$NAME" )

echo
echo "✓ $OUT  ($(du -h "$OUT" | cut -f1), $(unzip -l "$OUT" | tail -1 | awk '{print $2}') files)"
echo "  Contents are the tracked files at $(git rev-parse --short HEAD) minus author-only files."
