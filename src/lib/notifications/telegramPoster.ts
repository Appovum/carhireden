// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Telegram Deal Channel Poster
// Posts high-value discounts to Telegram channels via Telegram Bot API.
// ═══════════════════════════════════════════════════════════════════

export interface TelegramPostOptions {
  botToken?: string;
  chatId?: string;
  storeName: string;
  title: string;
  discountText: string;
  code?: string;
  outboundUrl: string;
}

export async function postDealToTelegram(options: TelegramPostOptions): Promise<{ success: boolean; messageId?: string }> {
  const { botToken, chatId, storeName, title, discountText, code, outboundUrl } = options;

  const text = `🔥 *${storeName}* Deal Alert!\n\n` +
    `📌 *${title}*\n` +
    `💰 Discount: *${discountText}*\n` +
    (code ? `🎟️ Code: \`${code}\`\n` : "") +
    `\n👉 [Get Deal Here](${outboundUrl})`;

  if (!botToken || !chatId) {
    // Log to console if Telegram bot credentials not configured
    console.log(`[TELEGRAM MOCK POST]\n${text}`);
    return { success: true, messageId: "mock_tg_msg_1" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    const data = await res.json();
    return { success: data.ok, messageId: data.result?.message_id ? String(data.result.message_id) : undefined };
  } catch (err: any) {
    console.error("Telegram post failed:", err);
    return { success: false };
  }
}
