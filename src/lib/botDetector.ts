// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Bot Detector Utility
// Filters crawlers, bots, and automated scripts from click logs.
// ═══════════════════════════════════════════════════════════════════

const BOT_USER_AGENT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /pinterest/i,
  /redditbot/i,
  /discordbot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /python-requests/i,
  /python-urllib/i,
  /curl/i,
  /wget/i,
  /go-http-client/i,
  /libwww-perl/i,
  /php/i,
  /axios/i,
  /node-fetch/i,
  /scrapy/i,
  /phantomjs/i,
  /headlesschrome/i,
  /puppeteer/i,
  /selenium/i,
  /bot/i,
  /spider/i,
  /crawler/i,
];

export interface BotDetectionResult {
  isBot: boolean;
  botScore: number; // 0.0 (human) to 1.0 (definitely bot)
  reason?: string;
}

export function detectBot(userAgent: string | null | undefined, headers?: Record<string, string>): BotDetectionResult {
  if (!userAgent || userAgent.trim() === "") {
    return { isBot: true, botScore: 1.0, reason: "missing_user_agent" };
  }

  const ua = userAgent.toLowerCase();

  for (const pattern of BOT_USER_AGENT_PATTERNS) {
    if (pattern.test(ua)) {
      return { isBot: true, botScore: 1.0, reason: `ua_match:${pattern.source}` };
    }
  }

  // Check common bot headers if provided
  if (headers) {
    if (headers["x-purpose"] === "preview" || headers["purpose"] === "prefetch") {
      return { isBot: true, botScore: 0.8, reason: "prefetch_header" };
    }
  }

  return { isBot: false, botScore: 0.0 };
}
