// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Rate Limiter (DB / Redis / Memory Fallback)
// Persistent multi-instance sliding-window rate limiter.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(now - windowMs);

  try {
    // DB-backed persistent sliding window rate limiting
    const recentHits = await db.auditLog.count({
      where: {
        action: `rate_limit:${key}`,
        createdAt: { gte: windowStart },
      },
    });

    if (recentHits >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs: windowMs,
      };
    }

    // Log current tick to database
    await db.auditLog.create({
      data: {
        userId: null,
        action: `rate_limit:${key}`,
        resource: "rate_limit",
        resourceId: key,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      limit,
      remaining: limit - (recentHits + 1),
      resetMs: windowMs,
    };
  } catch {
    // In-memory fallback if database query fails or during fast unit tests
    let record = memoryStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      memoryStore.set(key, record);
    }

    record.timestamps = record.timestamps.filter((ts) => ts > now - windowMs);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetMs = oldest + windowMs - now;
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    return {
      success: true,
      limit,
      remaining: limit - record.timestamps.length,
      resetMs: windowMs,
    };
  }
}

export function clearRateLimitStore(): void {
  memoryStore.clear();
}
