// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Database Client Singleton
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

// Never fall back to a hardcoded connection string. If DATABASE_URL is
// missing, fail loudly so a misconfigured install can't silently connect
// to someone else's database.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL to your own PostgreSQL connection string."
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

delete (globalThis as any).prisma;

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
