// ═══════════════════════════════════════════════════════════════════
// Uploaded files — GET /uploads/<path>
//
// Next.js only serves files from public/ that existed when the server
// started, so store logos downloaded during a sync (saved to
// public/uploads/logos while the app runs) returned 404 until a restart.
// Files that existed at startup are still served by Next directly; anything
// added later falls through to this route and is served from disk.
// ═══════════════════════════════════════════════════════════════════

import { promises as fs } from "fs";
import path from "path";
import { MAX_UPLOAD_BYTES, UPLOADS_ROOT, resolveUploadPath } from "@/lib/uploads/resolveUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): Response {
  // no-store so a logo that appears after the next sync is not hidden by a cached 404
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header
    .split(",")
    .map((value) => value.trim().replace(/^W\//, ""))
    .some((value) => value === "*" || value === etag.replace(/^W\//, ""));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  const resolved = resolveUploadPath(segments);
  if (!resolved) return notFound();

  try {
    // Resolve symlinks and make sure the real file is still inside the uploads folder.
    const [rootReal, fileReal] = await Promise.all([
      fs.realpath(UPLOADS_ROOT),
      fs.realpath(resolved.filePath),
    ]);
    if (!fileReal.startsWith(rootReal + path.sep)) return notFound();

    const stat = await fs.stat(fileReal);
    if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) return notFound();

    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers: Record<string, string> = {
      "Content-Type": resolved.contentType,
      // Logos are overwritten when a store is re-synced, so the URL is not immutable.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ETag: etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    };

    const ifNoneMatch = request.headers.get("if-none-match");
    const ifModifiedSince = request.headers.get("if-modified-since");
    const notModified = ifNoneMatch
      ? etagMatches(ifNoneMatch, etag)
      : ifModifiedSince !== null && new Date(ifModifiedSince).getTime() >= Math.floor(stat.mtimeMs / 1000) * 1000;
    if (notModified) return new Response(null, { status: 304, headers });

    const body = await fs.readFile(fileReal);
    return new Response(new Uint8Array(body), {
      headers: { ...headers, "Content-Length": String(body.length) },
    });
  } catch {
    // missing file, unreadable file, broken symlink, missing uploads folder
    return notFound();
  }
}
