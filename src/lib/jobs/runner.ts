// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Job Scheduler, Retry Engine & Dead-Letter Queue
// Retries failed background jobs with exponential backoff and logs
// exhausted failures to the Dead-Letter Queue for admin inspection.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface JobResult {
  jobName: string;
  success: boolean;
  attempts: number;
  error?: string;
  deadLetter?: boolean;
}

export async function runJobWithRetry(
  jobName: string,
  fn: () => Promise<any>,
  maxRetries: number = 3
): Promise<JobResult> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      await fn();
      return {
        jobName,
        success: true,
        attempts: attempt,
      };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        // Short exponential backoff pause (e.g. 50ms for tests, 1000ms for production)
        const delay = process.env.NODE_ENV === "test" ? 10 : Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // Exhausted all retries -> Send to Dead-Letter Queue (audit_log)
  await db.auditLog.create({
    data: {
      userId: null,
      action: "job_dead_letter_failed",
      resource: "job",
      resourceId: jobName,
      detailsJson: JSON.stringify({
        jobName,
        failedAt: new Date(),
        totalAttempts: attempt,
        error: lastError?.message || String(lastError),
      }),
    },
  });

  return {
    jobName,
    success: false,
    attempts: attempt,
    error: lastError?.message || String(lastError),
    deadLetter: true,
  };
}

export async function listDeadLetterJobs() {
  return db.auditLog.findMany({
    where: { action: "job_dead_letter_failed" },
    orderBy: { createdAt: "desc" },
  });
}
