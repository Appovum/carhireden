# ═══════════════════════════════════════════════════════════════════
# CouponPilot — Production Dockerfile (Next.js standalone + Prisma)
#
# Build:  docker compose up -d --build        (see docker-compose.yml)
# The container creates/updates the database tables on start
# (docker-entrypoint.sh), then runs the standalone Next.js server.
# ═══════════════════════════════════════════════════════════════════

FROM node:20-alpine AS base
# libc6-compat: needed by Next.js and sharp on Alpine (musl).
# openssl: required by Prisma's engines on Alpine.
RUN apk add --no-cache libc6-compat openssl

# ── 1. Dependencies ────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ── 2. Build ───────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are baked into the JavaScript at build time, so they
# are build arguments (docker-compose.yml passes them from your .env).
# Changing them later requires `docker compose up -d --build`.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=true

# `npm run build` = prisma generate && next build. No database is needed here.
RUN npm run build

# Remember the exact Prisma version so the runtime CLI below matches it.
RUN node -p "require('prisma/package.json').version" > /app/.prisma-version

# ── 3. Runtime ─────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Prisma CLI in its own folder (the standalone output does not include it).
# docker-entrypoint.sh uses it to create the database tables on start.
COPY --from=builder /app/.prisma-version /tmp/.prisma-version
RUN npm install --prefix /opt/prisma-cli --no-audit --no-fund --no-save \
      "prisma@$(cat /tmp/.prisma-version)" \
    && rm /tmp/.prisma-version

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Store logos are written here at runtime; docker-compose.yml mounts a volume
# on this folder so they survive container rebuilds.
RUN mkdir -p public/uploads/logos && chown -R nextjs:nodejs public/uploads

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
