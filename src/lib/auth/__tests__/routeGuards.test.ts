import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════
// Structural tests: they read the source of every API route and fail when a
// route is added or changed in a way that would reopen the 1.0.7 hole (admin
// APIs reachable without logging in, and APIs that trust a user id the caller
// supplies). No database or server is needed.
// ═══════════════════════════════════════════════════════════════════

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "src", "app", "api");
const HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

function listFiles(dir: string, match: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, match));
    else if (match(full)) out.push(full);
  }
  return out.sort();
}

const routeFiles = listFiles(API_DIR, (f) => f.endsWith(`${path.sep}route.ts`));
const rel = (f: string) => path.relative(API_DIR, f).split(path.sep).join("/");

/** The text of each exported handler's body start, found by matching the parameter list's parentheses. */
function handlers(source: string): Array<{ method: string; start: string }> {
  const found: Array<{ method: string; start: string }> = [];
  for (const m of source.matchAll(HANDLER)) {
    let depth = 0;
    let i = (m.index ?? 0) + m[0].length - 1;
    for (; i < source.length; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")" && --depth === 0) break;
    }
    const brace = source.indexOf("{", i);
    found.push({ method: m[1], start: source.slice(brace + 1, brace + 400) });
  }
  return found;
}

const firstStatements = (start: string, guard: string) =>
  new RegExp(`^\\s*(?://[^\\n]*\\n\\s*)*const auth = await ${guard}\\(\\);\\s*if \\(!auth\\.ok\\) return auth\\.response;`).test(start);

const adminRoutes = routeFiles.filter((f) => rel(f).startsWith("admin/"));
const accountRoutes = routeFiles.filter((f) => rel(f).startsWith("account/"));

describe("every admin API handler starts with the admin guard", () => {
  it("finds the admin routes", () => {
    expect(adminRoutes.length).toBeGreaterThan(20);
  });

  for (const file of adminRoutes) {
    it(`admin/${rel(file).slice("admin/".length)}`, () => {
      const list = handlers(fs.readFileSync(file, "utf8"));
      expect(list.length, "route exports no handler").toBeGreaterThan(0);
      for (const { method, start } of list) {
        expect(firstStatements(start, "requireAdminApi"), `${method} must begin with: const auth = await requireAdminApi(); if (!auth.ok) return auth.response;`).toBe(true);
      }
    });
  }
});

describe("every account API handler starts with the user guard", () => {
  it("finds the account routes", () => {
    expect(accountRoutes.length).toBeGreaterThanOrEqual(5);
  });

  for (const file of accountRoutes) {
    it(`account/${rel(file).slice("account/".length)}`, () => {
      const list = handlers(fs.readFileSync(file, "utf8"));
      expect(list.length).toBeGreaterThan(0);
      for (const { method, start } of list) {
        expect(firstStatements(start, "requireUserApi"), `${method} must begin with: const auth = await requireUserApi(); if (!auth.ok) return auth.response;`).toBe(true);
      }
    });
  }

  it("never takes a user id from the request body or URL", () => {
    for (const file of accountRoutes) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, rel(file)).not.toMatch(/body\.userId/);
      expect(source, rel(file)).not.toMatch(/searchParams\.get\(\s*["']userId["']\s*\)/);
      // a destructuring of the request body that includes userId
      expect(source, rel(file)).not.toMatch(/const\s*\{[^}]*\buserId\b[^}]*\}\s*=\s*(body|await)/);
    }
  });
});

describe("the session cookie is only handled by the auth modules", () => {
  const ALLOWED = new Set([
    "src/lib/auth/sessionToken.ts",
    "src/lib/auth/sessionCookie.ts",
    "src/lib/auth/currentUser.ts",
    "src/middleware.ts",
  ]);

  it("no other file reads or writes cp_session", () => {
    const sources = listFiles(path.join(ROOT, "src"), (f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"));
    const offenders = sources
      .map((f) => path.relative(ROOT, f).split(path.sep).join("/"))
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => /cp_session/.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no route sets the cookie to a bare user id", () => {
    for (const file of routeFiles) {
      expect(fs.readFileSync(file, "utf8"), rel(file)).not.toMatch(/cookies\.set\(\s*["']cp_session["']\s*,\s*user\.id/);
    }
  });
});

describe("every API route is classified, so a new route is locked until someone decides", () => {
  // Public on purpose, with the reason each is safe without a session.
  const PUBLIC: Record<string, string> = {
    "ads/event/route.ts": "ad impression tracking",
    "ads/track/route.ts": "ad click tracking",
    "advertise/checkout/route.ts": "advertisers pay before they have an account",
    "advertise/config/route.ts": "public pricing",
    "advertise/confirm/route.ts": "order confirmation page after paying",
    "advertiser/portal/route.ts": "secret magic-link token",
    "auth/forgot-password/route.ts": "sign-in flow",
    "auth/login/route.ts": "sign-in flow",
    "auth/logout/route.ts": "sign-in flow",
    "auth/me/route.ts": "reports who is signed in from the session; no input",
    "auth/reset-password/route.ts": "sign-in flow, needs a signed reset token",
    "auth/signup/route.ts": "sign-in flow; role is never taken from the request",
    "categories/route.ts": "public catalog",
    "click/create/route.ts": "visitors click coupons; user comes from the session if any",
    "contact/route.ts": "public contact form",
    "coupon/vote/route.ts": "visitors vote; user comes from the session if any",
    "coupons/search/route.ts": "public catalog",
    "coupons/submit/route.ts": "public submissions, held for moderation",
    "cron/campaign-expiry/route.ts": "requires CRON_SECRET",
    "i18n/route.ts": "public, read-only UI translation strings",
    "install/route.ts": "first-run setup; locks once an admin exists",
    "search/autocomplete/route.ts": "public catalog",
    "settings/route.ts": "public site settings",
    "stores/search/route.ts": "public catalog",
    "webhooks/paypal/route.ts": "verified webhook signature",
    "webhooks/stripe/route.ts": "verified webhook signature",
  };

  it("has a decision for every route outside admin/ and account/", () => {
    const unclassified = routeFiles
      .map(rel)
      .filter((r) => !r.startsWith("admin/") && !r.startsWith("account/"))
      .filter((r) => !(r in PUBLIC));
    expect(
      unclassified,
      "New API routes must be guarded (put them under admin/ or account/, or call requireUserApi) or added to PUBLIC above with a reason."
    ).toEqual([]);
  });

  it("does not list routes that no longer exist", () => {
    const existing = new Set(routeFiles.map(rel));
    expect(Object.keys(PUBLIC).filter((r) => !existing.has(r))).toEqual([]);
  });

  it("keeps the cron and install routes protected by their own checks", () => {
    expect(fs.readFileSync(path.join(API_DIR, "cron/campaign-expiry/route.ts"), "utf8")).toMatch(/CRON_SECRET/);
    expect(fs.readFileSync(path.join(API_DIR, "install/route.ts"), "utf8")).toMatch(/role:\s*"admin"/);
  });
});
