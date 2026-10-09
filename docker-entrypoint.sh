#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# CouponPilot — container entrypoint
# Creates any missing database tables, then starts the app.
#
# `prisma db push` only adds what is missing. If a schema change would
# delete data it stops with an error instead of doing it, so a restart
# can never silently drop your tables or columns.
#
# Set RUN_DB_PUSH=false to skip it (for example when you manage the
# database yourself).
# ═══════════════════════════════════════════════════════════════════
set -e

if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo "[couponpilot] Applying database schema..."
  /opt/prisma-cli/node_modules/.bin/prisma db push --schema ./prisma/schema.prisma --skip-generate
fi

exec "$@"
