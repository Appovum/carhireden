import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ db: { setting: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

import { DEFAULT_TRANSLATIONS, mergeCatalog, readCatalog, type TranslationItem } from "../catalog";

const item = (key: string, en: string, id = "x"): TranslationItem => ({ id, key, category: key.split(".")[0], en });

describe("mergeCatalog", () => {
  it("returns the defaults when nothing is stored", () => {
    const merged = mergeCatalog(undefined);
    expect(merged.map((m) => m.key)).toEqual(DEFAULT_TRANSLATIONS.map((d) => d.key));
  });

  it("keeps an admin's edit instead of the default text", () => {
    const merged = mergeCatalog([item("hero.title", "My own headline")]);
    expect(merged.find((m) => m.key === "hero.title")?.en).toBe("My own headline");
  });

  it("adds default keys that the stored list does not have yet", () => {
    const merged = mergeCatalog([item("custom.key", "Custom")]);
    expect(merged.some((m) => m.key === "custom.key")).toBe(true);
    expect(merged.some((m) => m.key === "header.nav_login")).toBe(true);
    expect(merged.length).toBe(DEFAULT_TRANSLATIONS.length + 1);
  });

  it("drops duplicate keys, keeping the first", () => {
    const merged = mergeCatalog([item("a.b", "first"), item("a.b", "second")]);
    const copies = merged.filter((m) => m.key === "a.b");
    expect(copies).toHaveLength(1);
    expect(copies[0].en).toBe("first");
  });

  it("gives every entry a unique id", () => {
    const merged = mergeCatalog([item("a.b", "x", "same"), item("c.d", "y", "same")]);
    expect(new Set(merged.map((m) => m.id)).size).toBe(merged.length);
  });

  it("ignores junk in the stored value", () => {
    expect(() => mergeCatalog("not a list")).not.toThrow();
    expect(() => mergeCatalog([null, 5, {}, { key: "" }])).not.toThrow();
    expect(mergeCatalog({ not: "an array" }).length).toBe(DEFAULT_TRANSLATIONS.length);
  });
});

describe("readCatalog (the public, read-only loader)", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns the defaults when no catalog is stored, without writing anything", async () => {
    findUnique.mockResolvedValue(null);
    expect(await readCatalog()).toEqual(DEFAULT_TRANSLATIONS);
  });

  it("returns the stored catalog merged with the defaults", async () => {
    findUnique.mockResolvedValue({ valueJson: JSON.stringify([item("hero.title", "Edited")]) });
    const catalog = await readCatalog();
    expect(catalog.find((c) => c.key === "hero.title")?.en).toBe("Edited");
    expect(catalog.length).toBe(DEFAULT_TRANSLATIONS.length);
  });

  it("falls back to the defaults when the stored value is corrupt", async () => {
    findUnique.mockResolvedValue({ valueJson: "{not json" });
    expect(await readCatalog()).toEqual(DEFAULT_TRANSLATIONS);
  });

  it("only ever reads: the database mock exposes no write method to call", async () => {
    findUnique.mockResolvedValue({ valueJson: "[]" });
    await expect(readCatalog()).resolves.toBeDefined();
  });
});
