import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";

describe("Admin UI Suite & Database Query Handlers", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("queries audit log records for administrative inspection", async () => {
    await db.auditLog.create({
      data: {
        action: "admin_test_action",
        resource: "system",
        detailsJson: JSON.stringify({ ok: true }),
      },
    });

    const logs = await db.auditLog.findMany({
      where: { action: "admin_test_action" },
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("admin_test_action");
  });
});
