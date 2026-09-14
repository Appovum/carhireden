import { describe, it, expect } from "vitest";
import { detectBot } from "../botDetector";

describe("Bot Detector Utility", () => {
  it("detects Googlebot, Bingbot, and python crawlers", () => {
    const google = detectBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
    expect(google.isBot).toBe(true);
    expect(google.botScore).toBe(1.0);

    const python = detectBot("python-requests/2.28.1");
    expect(python.isBot).toBe(true);

    const curl = detectBot("curl/7.68.0");
    expect(curl.isBot).toBe(true);
  });

  it("identifies legitimate desktop and mobile browsers as non-bots", () => {
    const chrome = detectBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    expect(chrome.isBot).toBe(false);
    expect(chrome.botScore).toBe(0.0);

    const safariMobile = detectBot("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    expect(safariMobile.isBot).toBe(false);
  });

  it("handles empty or missing user agents as bots", () => {
    expect(detectBot(null).isBot).toBe(true);
    expect(detectBot("").isBot).toBe(true);
  });
});
