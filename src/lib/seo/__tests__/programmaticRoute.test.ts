import { describe, it, expect } from "vitest";
import { parseProgrammaticSlug, FIRST_SUPPORTED_YEAR } from "../programmaticRoute";

// Fixed clock so the year window is deterministic.
const NOW = new Date("2026-10-09T12:00:00Z");

describe("parseProgrammaticSlug", () => {
  it("parses a plain store, month and year", () => {
    expect(parseProgrammaticSlug("nike-coupons-august-2026", NOW)).toEqual({
      storeSlug: "nike",
      month: 8,
      monthLabel: "August",
      year: 2026,
      canonicalSlug: "nike-coupons-august-2026",
    });
  });

  it("keeps hyphens inside the store slug", () => {
    const parsed = parseProgrammaticSlug("marks-and-spencer-coupons-january-2026", NOW);
    expect(parsed?.storeSlug).toBe("marks-and-spencer");
    expect(parsed?.month).toBe(1);
  });

  it("splits on the last '-coupons-' when the store name contains the word", () => {
    const parsed = parseProgrammaticSlug("super-coupons-hub-coupons-may-2026", NOW);
    expect(parsed?.storeSlug).toBe("super-coupons-hub");
    expect(parsed?.monthLabel).toBe("May");
  });

  it("accepts mixed case and returns a lowercase canonical slug", () => {
    const parsed = parseProgrammaticSlug("Nike-Coupons-August-2026", NOW);
    expect(parsed?.storeSlug).toBe("nike");
    expect(parsed?.canonicalSlug).toBe("nike-coupons-august-2026");
  });

  it("rejects slugs that do not have the programmatic shape", () => {
    expect(parseProgrammaticSlug("nike", NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike-coupons", NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike-coupons-august", NOW)).toBeNull();
    expect(parseProgrammaticSlug("this-page-does-not-exist", NOW)).toBeNull();
    expect(parseProgrammaticSlug("", NOW)).toBeNull();
    expect(parseProgrammaticSlug("-coupons-august-2026", NOW)).toBeNull();
  });

  it("rejects an unknown month name", () => {
    expect(parseProgrammaticSlug("nike-coupons-augustus-2026", NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike-coupons-foo-2026", NOW)).toBeNull();
  });

  it("limits the year to FIRST_SUPPORTED_YEAR through next year", () => {
    expect(parseProgrammaticSlug(`nike-coupons-august-${FIRST_SUPPORTED_YEAR}`, NOW)).not.toBeNull();
    expect(parseProgrammaticSlug(`nike-coupons-august-${FIRST_SUPPORTED_YEAR - 1}`, NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike-coupons-august-2027", NOW)).not.toBeNull();
    expect(parseProgrammaticSlug("nike-coupons-august-2028", NOW)).toBeNull();
  });

  it("rejects characters that are not valid in a slug", () => {
    expect(parseProgrammaticSlug("nike/../x-coupons-august-2026", NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike coupons-coupons-august-2026", NOW)).toBeNull();
    expect(parseProgrammaticSlug("nike_x-coupons-august-2026", NOW)).toBeNull();
  });

  it("rejects an oversized slug without scanning it", () => {
    const huge = `${"a-".repeat(200)}coupons-august-2026`;
    expect(parseProgrammaticSlug(huge, NOW)).toBeNull();
  });
});
