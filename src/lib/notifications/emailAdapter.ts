// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Email Notification Adapter
// Pluggable dispatch layer supporting SMTP, API, and Console fallbacks.
// ═══════════════════════════════════════════════════════════════════

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }>;
}

export class ConsoleEmailAdapter implements EmailAdapter {
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    console.log(`[EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}`);
    return { success: true, messageId: `msg_${Date.now()}` };
  }
}

export const defaultEmailAdapter: EmailAdapter = new ConsoleEmailAdapter();
