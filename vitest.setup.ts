// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Test safety guard
//
// Several suites delete and re-seed rows. Running them against a live
// database destroys real data, so refuse to start unless the target is
// clearly a throwaway test database.
//
// A database qualifies when its URL contains "test" (e.g. a *_test
// database or a Neon test branch), points at localhost, or the operator
// sets ALLOW_DESTRUCTIVE_TESTS=true to say "yes, I mean this one".
// ═══════════════════════════════════════════════════════════════════

const url = process.env.DATABASE_URL || "";

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Point it at a disposable test database before running the suite."
  );
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])/.test(url);
const looksLikeTestDb = /test/i.test(url.replace(/^[a-z]+:\/\/[^@]*@/i, ""));
const override = process.env.ALLOW_DESTRUCTIVE_TESTS === "true";

if (!isLocal && !looksLikeTestDb && !override) {
  const host = url.replace(/^[a-z]+:\/\/[^@]*@/i, "").split(/[/?]/)[0];
  throw new Error(
    [
      "",
      "═══════════════════════════════════════════════════════════════",
      "  REFUSING TO RUN TESTS — this looks like a real database.",
      "",
      `  Target: ${host}`,
      "",
      "  These tests delete and re-seed rows. Running them here would",
      "  destroy live data.",
      "",
      "  Use a disposable database instead, e.g.:",
      "    DATABASE_URL='postgresql://...:5432/couponpilot_test' npx vitest run",
      "",
      "  If you are certain this database is disposable:",
      "    ALLOW_DESTRUCTIVE_TESTS=true npx vitest run",
      "═══════════════════════════════════════════════════════════════",
      "",
    ].join("\n")
  );
}
