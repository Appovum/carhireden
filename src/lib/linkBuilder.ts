// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Network Link Builder
// Supports dual strategies:
// 1. "template": Interpolates deep-link URL templates (used by Awin)
// 2. "append_subid": Appends &sid={subId} directly to ready-built clickUrl (used by CJ)
// ═══════════════════════════════════════════════════════════════════

export type LinkStrategy = "template" | "append_subid";

export interface LinkBuilderParams {
  strategy?: LinkStrategy;
  linkTemplate?: string | null;
  affiliateId?: string | null;
  merchantId?: string | null;
  subId: string;
  destinationUrl: string;
}

/**
 * Builds the final deep-link URL for an affiliate click redirect.
 * Supports both template-based interpolation and direct subid query parameter appending.
 */
export function buildAffiliateLink(params: LinkBuilderParams): string {
  const { strategy = "template", linkTemplate, affiliateId, merchantId, subId, destinationUrl } = params;

  if (!destinationUrl || !destinationUrl.trim()) {
    throw new Error("Missing destinationUrl for affiliate link builder");
  }

  // Strategy 2: Ready-built CJ Click URL (append &sid={subId})
  if (strategy === "append_subid" || (!linkTemplate && destinationUrl.includes("anrdoezrs.net"))) {
    if (!subId) return destinationUrl;
    if (destinationUrl.includes("sid=")) {
      return destinationUrl.replace(/sid=[^&]*/, `sid=${encodeURIComponent(subId)}`);
    }
    const separator = destinationUrl.includes("?") ? "&" : "?";
    return `${destinationUrl}${separator}sid=${encodeURIComponent(subId)}`;
  }

  // Strategy 1: Template interpolation
  if (!linkTemplate || !linkTemplate.trim()) {
    return destinationUrl;
  }

  const encodedDestUrl = encodeURIComponent(destinationUrl);
  let result = linkTemplate;

  // 1. Sub / Click ID replacement
  if (subId) {
    result = result.replace(
      /\{subid\}|\{subId\}|\{sub_id\}|\{clickref\}|\{clickRef\}|\{click_id\}|\{clickId\}/gi,
      subId
    );
  }

  // 2. Affiliate / Publisher ID replacement
  if (affiliateId) {
    result = result.replace(
      /\{affiliate_id\}|\{affiliateId\}|\{publisher_id\}|\{publisherId\}|\{affid\}|\{pubid\}|\{pubId\}/gi,
      affiliateId
    );
  }

  // 3. Merchant / Advertiser ID replacement
  if (merchantId) {
    result = result.replace(
      /\{merchant_id\}|\{merchantId\}|\{advertiser_id\}|\{advertiserId\}|\{mid\}|\{projectId\}|\{linkId\}/gi,
      merchantId
    );
  }

  // 4. Encoded Destination URL replacement
  result = result.replace(
    /\{destination_url_encoded\}|\{destinationUrlEncoded\}|\{ued_encoded\}/gi,
    encodedDestUrl
  );

  // Handle ued={destination_url} / ued={destinationUrl} explicitly
  if (/ued=\{destination_url\}/gi.test(result) || /ued=\{destinationUrl\}/gi.test(result)) {
    result = result
      .replace(/ued=\{destination_url\}/gi, `ued=${encodedDestUrl}`)
      .replace(/ued=\{destinationUrl\}/gi, `ued=${encodedDestUrl}`);
  }

  // General {destination_url} / {destinationUrl} replacement
  result = result.replace(
    /\{destination_url\}|\{destinationUrl\}/gi,
    encodedDestUrl
  );

  // 5. Fail Loudly: Check for any remaining unresolved placeholders
  const unhandledMatch = result.match(/\{[a-zA-Z0-9_-]+\}/g);
  if (unhandledMatch && unhandledMatch.length > 0) {
    const missingKeys = Array.from(new Set(unhandledMatch)).join(", ");
    throw new Error(
      `Affiliate link template has unresolvable placeholder(s): ${missingKeys}`
    );
  }

  // 6. Validate constructed URL format
  try {
    new URL(result);
    return result;
  } catch {
    throw new Error(`Constructed affiliate link is not a valid URL: ${result}`);
  }
}
