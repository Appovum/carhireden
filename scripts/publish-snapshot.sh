#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Publish a clean snapshot of the current commit to a
# customer's git repository as ONE commit on top of their branch.
#
# Why a snapshot and not `git push`: our own history contains files that
# must never reach a customer (leaked keys in old commits, the old zip).
# This ships only the tracked files at HEAD, minus author-only files
# (same rules as build-release.sh), preserving the customer's history.
#
# Usage:  bash scripts/publish-snapshot.sh <repo-url> [branch]
#   e.g.  bash scripts/publish-snapshot.sh https://github.com/Acme/site.git main
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${1:?usage: publish-snapshot.sh <repo-url> [branch]}"
BRANCH="${2:-main}"
REV="$(git rev-parse --short HEAD)"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "✗ Uncommitted changes to tracked files — commit first." >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "→ Exporting tracked files at $REV"
mkdir -p "$WORK/src"
git archive --format=tar HEAD | tar -x -C "$WORK/src"
rm -rf "$WORK/src/.claude" "$WORK/src/AGENTS.md" "$WORK/src/CLAUDE.md" \
       "$WORK/src/to-do.md" "$WORK/src/couponpilot-preview-slides.html"
find "$WORK/src" -name '.DS_Store' -delete

echo "→ Secret scan"
if grep -rInE --exclude=package-lock.json --exclude=build-release.sh --exclude=publish-snapshot.sh \
     'npg_[A-Za-z0-9]|neon\.tech/|sk_(live|test)_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|AeDo[A-Za-z0-9_-]{20}|EJCY[A-Za-z0-9_-]{20}|leojwcusyscfbamd|3017873|8033258|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
     "$WORK/src" >/dev/null 2>&1; then
  echo "✗ Secret scan matched — refusing to publish. Run scripts/build-release.sh for details." >&2
  exit 1
fi
for f in .env .env.local; do [ -e "$WORK/src/$f" ] && { echo "✗ $f present — refusing." >&2; exit 1; }; done
echo "   ✓ clean"

echo "→ Cloning $REPO ($BRANCH)"
git clone -q --branch "$BRANCH" --single-branch "$REPO" "$WORK/repo"

echo "→ Replacing working tree with snapshot"
( cd "$WORK/repo" && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + )
cp -R "$WORK/src/." "$WORK/repo/"

cd "$WORK/repo"
git add -A
if git diff --cached --quiet; then
  echo "✓ Customer repo already matches $REV — nothing to push."
  exit 0
fi
echo "→ Changes:"; git diff --cached --stat | tail -1
git commit -q -m "Update CouponPilot to $REV

Security and configuration update:
- Remove hardcoded database connection fallbacks (src/lib/db.ts, vitest.config.mts);
  DATABASE_URL must now be set in .env.
- Remove hardcoded affiliate publisher-ID fallbacks; configure your own Awin/CJ
  IDs in Admin → Networks or .env (AWIN_*, CJ_*, ENABLE_LIVE_AFFILIATE_LINKS).
- Document affiliate env vars in .env.example and DOCUMENTATION.
- Add scripts/: provision-database.sh (schema + catalog seed), reinstall-database.sh,
  rotate-db-credentials.sh, build-release.sh.
- Login page: one-click demo sign-in when NEXT_PUBLIC_DEMO_MODE=true."
git push -q origin "HEAD:$BRANCH"
echo "✓ Pushed $(git rev-parse --short HEAD) to $REPO $BRANCH"
