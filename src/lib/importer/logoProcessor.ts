// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Import Logo Processor (Sharp Engine)
// Source Priority: 1. Merchant Favicon (128px) -> 2. Awin Logo -> 3. Letter Avatar
// Downloads, trims padding, flattens onto white canvas, and caches WebP locally.
// ═══════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const LOGOS_DIR = path.join(process.cwd(), "public", "uploads", "logos");

// Known default Google favicon placeholder MD5 hash (generic globe)
const GOOGLE_DEFAULT_FAVICON_MD5 = "b8a0bf372c762e966cc99ede8682bc71";

function ensureLogosDirectory() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }
}

/**
 * Downloads, validates, and processes a store logo image.
 * Priority: 1. Favicon (128px) -> 2. Awin Logo URL -> 3. Null (Letter avatar)
 */
export async function processAndSaveStoreLogo(
  domain: string | null | undefined,
  awinLogoUrl: string | null | undefined,
  storeSlug: string
): Promise<string | null> {
  ensureLogosDirectory();

  const cleanDomain = domain
    ? domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim()
    : "";

  const filename = `${storeSlug.replace(/[^a-z0-9_-]/g, "")}.webp`;
  const outputPath = path.join(LOGOS_DIR, filename);

  // Priority 1: Merchant Domain Favicon at 128px
  if (cleanDomain && cleanDomain !== "awin1.com" && !cleanDomain.startsWith("advertiser-")) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
    const faviconPath = await downloadAndProcessImage(faviconUrl, outputPath, true);
    if (faviconPath) {
      return faviconPath;
    }
  }

  // Priority 2: Awin Logo URL (Wordmark)
  if (awinLogoUrl && awinLogoUrl.startsWith("http")) {
    const wordmarkPath = await downloadAndProcessImage(awinLogoUrl, outputPath, false);
    if (wordmarkPath) {
      return wordmarkPath;
    }
  }

  // Priority 3: Fallback (returns null to trigger DJB2 letter avatar)
  return null;
}

async function downloadAndProcessImage(
  url: string,
  outputPath: string,
  isFavicon: boolean
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CouponPilotBot/1.0" },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response || !response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) return null;

    // Reject Google default globe favicon placeholder
    if (isFavicon) {
      const md5 = crypto.createHash("md5").update(buffer).digest("hex");
      if (md5 === GOOGLE_DEFAULT_FAVICON_MD5 || buffer.length === 726) {
        return null;
      }
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height || metadata.width < 24 || metadata.height < 24) {
      return null;
    }

    // Process image: Trim surrounding padding, fit into 128x128 square canvas, flatten onto white background
    const processedBuffer = await image
      .trim({ threshold: 12 })
      .flatten({ background: "#ffffff" })
      .resize(128, 128, {
        fit: "contain",
        background: "#ffffff",
      })
      .webp({ quality: 90 })
      .toBuffer();

    await fs.promises.writeFile(outputPath, processedBuffer);
    const filename = path.basename(outputPath);
    return `/uploads/logos/${filename}`;
  } catch (err) {
    return null;
  }
}
