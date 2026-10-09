import { describe, it, expect } from "vitest";
import path from "path";
import { resolveUploadPath } from "../resolveUpload";

const ROOT = path.join(path.sep, "srv", "app", "public", "uploads");

describe("resolveUploadPath", () => {
  it("resolves a logo inside the uploads folder", () => {
    expect(resolveUploadPath(["logos", "nike.webp"], ROOT)).toEqual({
      filePath: path.join(ROOT, "logos", "nike.webp"),
      contentType: "image/webp",
    });
  });

  it("accepts the supported raster image types, any case", () => {
    expect(resolveUploadPath(["a.PNG"], ROOT)?.contentType).toBe("image/png");
    expect(resolveUploadPath(["a.jpg"], ROOT)?.contentType).toBe("image/jpeg");
    expect(resolveUploadPath(["a.jpeg"], ROOT)?.contentType).toBe("image/jpeg");
    expect(resolveUploadPath(["a.gif"], ROOT)?.contentType).toBe("image/gif");
    expect(resolveUploadPath(["a.avif"], ROOT)?.contentType).toBe("image/avif");
  });

  it("rejects file types that are not raster images", () => {
    for (const name of ["a.svg", "a.html", "a.js", "a.txt", "a.php", "a.json", "a", "a.webp.exe"]) {
      expect(resolveUploadPath([name], ROOT)).toBeNull();
    }
  });

  it("rejects an empty path and an over-deep path", () => {
    expect(resolveUploadPath([], ROOT)).toBeNull();
    expect(resolveUploadPath(["a", "b", "c", "d", "e", "f", "g.webp"], ROOT)).toBeNull();
  });

  it("rejects traversal segments", () => {
    expect(resolveUploadPath(["..", "package.json"], ROOT)).toBeNull();
    expect(resolveUploadPath(["logos", "..", "..", "secret.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath([".", "a.webp"], ROOT)).toBeNull();
  });

  it("rejects separators and control characters hidden inside a segment", () => {
    expect(resolveUploadPath(["logos/../../x.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath(["logos\\..\\x.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath(["x.webp\u0000.png"], ROOT)).toBeNull();
    expect(resolveUploadPath(["x\n.webp"], ROOT)).toBeNull();
  });

  it("rejects dotfiles", () => {
    expect(resolveUploadPath([".env.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath(["logos", ".hidden.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath([".git", "x.webp"], ROOT)).toBeNull();
  });

  it("rejects an absolute-looking segment and an empty segment", () => {
    expect(resolveUploadPath(["", "x.webp"], ROOT)).toBeNull();
    expect(resolveUploadPath(["/etc/passwd.webp"], ROOT)).toBeNull();
  });

  it("rejects an oversized segment", () => {
    expect(resolveUploadPath([`${"a".repeat(250)}.webp`], ROOT)).toBeNull();
  });

  it("keeps the resolved file inside the root for every accepted input", () => {
    const accepted = [["a.webp"], ["logos", "a.webp"], ["x", "y", "z.png"]];
    for (const segments of accepted) {
      const resolved = resolveUploadPath(segments, ROOT);
      expect(resolved).not.toBeNull();
      expect(path.relative(ROOT, resolved!.filePath).startsWith("..")).toBe(false);
    }
  });
});
