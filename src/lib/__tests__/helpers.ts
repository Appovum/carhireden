import { db } from "@/lib/db";

export async function cleanDatabase() {
  if (process.env.SKIP_DB_CLEAN === "true") return;

  try {
    await db.walletEntry.deleteMany({});
    await db.withdrawal.deleteMany({});
    await db.conversion.deleteMany({});
    await db.click.deleteMany({});
    await db.couponVote.deleteMany({});
    await db.coupon.deleteMany({ where: { title: { contains: "Test" } } });
    await db.storeCategory.deleteMany({});
    await db.alert.deleteMany({});
    await db.featuredOrder.deleteMany({});
    await db.importRun.deleteMany({});
    await db.importSource.deleteMany({});
    await db.adCreative.deleteMany({});
    await db.adSlot.deleteMany({});
    await db.subscriber.deleteMany({});
    await db.auditLog.deleteMany({});
  } catch (err) {
    // Ignore cleanup errors during test teardowns
  }
}
