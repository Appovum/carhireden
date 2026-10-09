// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Database Client Singleton
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

// Never fall back to a real connection string. If DATABASE_URL is missing at
// runtime, fail loudly so a misconfigured install can't silently connect to
// someone else's database.
//
// The one exception is `next build`: it imports every route module to collect
// page data (for example while building a Docker image, where no database
// exists yet), but no page queries the database during the build. A placeholder
// that is never connected to keeps the build working; it is not used at runtime.
if (!process.env.DATABASE_URL) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    process.env.DATABASE_URL = "postgresql://build:build@localhost:5432/build";
  } else {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL to your own PostgreSQL connection string."
    );
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

delete (globalThis as any).prisma;

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
