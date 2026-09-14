import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { cleanDatabase } from "@/lib/__tests__/helpers";
import { runJobWithRetry, listDeadLetterJobs } from "../runner";
import { runDemoResetJob } from "../demoReset";

describe("Job Scheduler, Retry & Demo Reset Job", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("retries failed job and succeeds if second attempt passes", async () => {
    let attempts = 0;
    const res = await runJobWithRetry("test_flaky_job", async () => {
      attempts++;
      if (attempts === 1) throw new Error("Transient error");
      return "done";
    }, 3);

    expect(res.success).toBe(true);
    expect(res.attempts).toBe(2);
  });

  it("logs exhausted job failure to Dead-Letter Queue in audit_log", async () => {
    const res = await runJobWithRetry("test_failing_job", async () => {
      throw new Error("Permanent fatal error");
    }, 2);

    expect(res.success).toBe(false);
    expect(res.deadLetter).toBe(true);

    const deadLetters = await listDeadLetterJobs();
    expect(deadLetters.length).toBeGreaterThan(0);
  });

  it("executes automated demo reset job and restores database state", async () => {
    const res = await runDemoResetJob();
    expect(res.storesSeeded).toBeGreaterThan(0);
    expect(res.couponsSeeded).toBeGreaterThan(0);
  });
});
