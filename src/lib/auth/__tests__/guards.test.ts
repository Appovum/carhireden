import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "../sessionToken";

// The cookie jar and database the guards read from are replaced by test doubles.
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
  }),
}));

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } } }));

import { requireAdminApi, requireUserApi } from "../guards";
import { getSessionUserFromToken } from "../currentUser";

const HASH = "$2a$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "user",
    referralCode: null,
    referredById: null,
    createdAt: new Date("2026-01-01"),
    passwordHash: HASH,
    ...overrides,
  };
}

async function signIn(user = dbUser()) {
  cookieJar.set(SESSION_COOKIE, await createSessionToken({ id: user.id, passwordHash: user.passwordHash as string | null }));
}

describe("API guards", () => {
  beforeEach(() => {
    vi.stubEnv("APP_SECRET", "guard-test-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    cookieJar.clear();
    findUnique.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  describe("requireAdminApi", () => {
    it("returns 401 with no cookie, without touching the database", async () => {
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("returns 401 for a made-up cookie that is not a token", async () => {
      cookieJar.set(SESSION_COOKIE, "not-a-real-user-id");
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("returns 401 for the old cookie format, a real user id", async () => {
      cookieJar.set(SESSION_COOKIE, "user-1");
      findUnique.mockResolvedValue(dbUser({ role: "admin" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("returns 403 for a signed-in normal user", async () => {
      await signIn();
      findUnique.mockResolvedValue(dbUser({ role: "user" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(403);
    });

    it("lets a signed-in administrator through and returns who they are", async () => {
      await signIn();
      findUnique.mockResolvedValue(dbUser({ role: "admin" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user.id).toBe("user-1");
        expect(result.user.role).toBe("admin");
        expect(result.user).not.toHaveProperty("passwordHash");
      }
    });

    it("reads the role from the database, not from the token", async () => {
      await signIn(); // issued while a normal user
      findUnique.mockResolvedValue(dbUser({ role: "user" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
    });

    it("returns 401 once the user has been deleted", async () => {
      await signIn();
      findUnique.mockResolvedValue(null);
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it("returns 401 after the password changed, which ends old sessions", async () => {
      await signIn();
      findUnique.mockResolvedValue(dbUser({ role: "admin", passwordHash: "$2a$12$a-different-hash-after-a-password-change" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it("returns 401, and says why in the log, when APP_SECRET is not configured", async () => {
      await signIn();
      vi.stubEnv("APP_SECRET", "");
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      findUnique.mockResolvedValue(dbUser({ role: "admin" }));
      const result = await requireAdminApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
      expect(logged.mock.calls.flat().join(" ")).toMatch(/APP_SECRET/);
      logged.mockRestore();
    });
  });

  describe("requireUserApi", () => {
    it("returns 401 with no valid session", async () => {
      const result = await requireUserApi();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it("accepts any signed-in user, including a normal one", async () => {
      await signIn();
      findUnique.mockResolvedValue(dbUser({ role: "user" }));
      const result = await requireUserApi();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.user.id).toBe("user-1");
    });
  });

  describe("getSessionUserFromToken", () => {
    it("returns null for nothing and for garbage", async () => {
      expect(await getSessionUserFromToken(undefined)).toBeNull();
      expect(await getSessionUserFromToken("")).toBeNull();
      expect(await getSessionUserFromToken("garbage.garbage")).toBeNull();
    });
  });
});
