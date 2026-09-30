// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Network Credential Resolver
// Single source of truth for affiliate network credentials.
// Order of precedence: Admin → Networks (encrypted in DB) first,
// environment variables second. Everything that talks to a network
// must resolve credentials through here.
// ═══════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import type { NetworkCredentials } from "./types";

/** Per-network mapping of env var fallbacks. */
const ENV_FALLBACKS: Record<string, () => NetworkCredentials> = {
  awin: () => ({
    apiKey: process.env.AWIN_API_KEY || undefined,
    publisherId: process.env.AWIN_PUBLISHER_ID || undefined,
    affiliateId: process.env.AWIN_PUBLISHER_ID || undefined,
  }),
  cj: () => ({
    accessToken: process.env.CJ_PERSONAL_ACCESS_TOKEN || undefined,
    apiKey: process.env.CJ_PERSONAL_ACCESS_TOKEN || undefined,
    publisherId: process.env.CJ_PUBLISHER_ID || undefined,
    websiteId: process.env.CJ_PUBLISHER_ID || undefined,
  }),
};

/** Decrypt and parse whatever is stored on a Network row. Never throws. */
export function parseStoredCredentials(encrypted: string | null): NetworkCredentials {
  if (!encrypted) return {};
  try {
    const decrypted = decryptSecret(encrypted);
    const parsed = JSON.parse(decrypted);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Encrypt a credentials object for storage on a Network row. */
export function serializeCredentials(credentials: NetworkCredentials): string {
  return encryptSecret(JSON.stringify(credentials));
}

/**
 * Resolve the credentials to use for a network, DB first then env.
 * Fields are merged individually, so a publisher ID saved in the admin
 * panel still works alongside an API key that only exists in .env.
 */
export async function getNetworkCredentials(slug: string): Promise<NetworkCredentials> {
  const network = await db.network.findFirst({ where: { slug } });
  const stored = parseStoredCredentials(network?.apiCredentialsEncrypted ?? null);
  const env = ENV_FALLBACKS[slug]?.() ?? {};

  const merged: NetworkCredentials = { ...env };
  for (const [key, value] of Object.entries(stored)) {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  }

  // Normalise the aliases the connectors accept so callers never have to.
  if (slug === "awin") {
    merged.publisherId = merged.publisherId || merged.affiliateId;
    merged.affiliateId = merged.affiliateId || merged.publisherId;
  }
  if (slug === "cj") {
    merged.accessToken = merged.accessToken || merged.apiKey;
    merged.apiKey = merged.apiKey || merged.accessToken;
    merged.websiteId = merged.websiteId || merged.publisherId;
  }

  return merged;
}

/** Which required fields a network is missing, for clear error messages. */
export function missingCredentialFields(slug: string, creds: NetworkCredentials): string[] {
  const missing: string[] = [];
  if (slug === "awin") {
    if (!creds.apiKey) missing.push("API token");
    if (!creds.publisherId) missing.push("Publisher ID");
  }
  if (slug === "cj") {
    if (!creds.accessToken) missing.push("Personal Access Token");
    if (!creds.publisherId) missing.push("Publisher CID");
  }
  return missing;
}

/** True when a network has everything it needs to make live API calls. */
export async function isNetworkConfigured(slug: string): Promise<boolean> {
  const creds = await getNetworkCredentials(slug);
  return missingCredentialFields(slug, creds).length === 0;
}
