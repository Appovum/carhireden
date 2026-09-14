// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin System Audit Log API Route
// Route: GET /api/admin/audit-log
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const logs = await db.auditLog.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      actorEmail: log.user ? log.user.email : "system@couponpilot.com",
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId || "system",
      detailsJson: log.detailsJson || "{}",
      createdAt: log.createdAt.toISOString().replace("T", " ").slice(0, 16),
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error) {
    console.error("Audit log GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
