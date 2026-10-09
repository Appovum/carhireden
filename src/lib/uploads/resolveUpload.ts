// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Upload path validation
//
// Maps a request like /uploads/logos/nike.webp to a file inside
// public/uploads, or rejects it. Everything the request controls goes
// through here, so the rules are strict: image files only, no dotfiles,
// no path traversal, no absolute paths.
// ═══════════════════════════════════════════════════════════════════

import path from "path";

export const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/** Largest file the route will serve. Store logos are a few KB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Raster images only. SVG is deliberately absent: an SVG opened directly can
// run script. The app only writes .webp (see importer/logoProcessor.ts).
const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

const MAX_SEGMENTS = 6;
const MAX_SEGMENT_LENGTH = 200;

export interface ResolvedUpload {
  /** Absolute path of the file inside the uploads root. */
  filePath: string;
  contentType: string;
}

/**
 * Returns the file to serve, or null when the request is not a plain image
 * file path inside the uploads folder. This only checks the text of the path;
 * the route also resolves symlinks before reading.
 */
export function resolveUploadPath(
  segments: string[],
  root: string = UPLOADS_ROOT
): ResolvedUpload | null {
  if (segments.length === 0 || segments.length > MAX_SEGMENTS) return null;

  for (const segment of segments) {
    if (!segment || segment.length > MAX_SEGMENT_LENGTH) return null;
    // ".", ".." and dotfiles such as .env or .htaccess
    if (segment.startsWith(".")) return null;
    // path separators and control characters (including NUL)
    if (/[\\/\u0000-\u001f]/.test(segment)) return null;
  }

  const extension = path.extname(segments[segments.length - 1]).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return null;

  const filePath = path.join(root, ...segments);
  const relative = path.relative(root, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return { filePath, contentType };
}
