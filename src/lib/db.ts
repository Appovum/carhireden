// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Database Client Singleton
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

// Ensure DATABASE_URL has a safe default during build steps if unset
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_DMdN0HcL4AhI@ep-delicate-leaf-awismbmn-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

delete (globalThis as any).prisma;

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
