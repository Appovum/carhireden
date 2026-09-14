// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Transactional Email Templates
// Sends notifications for cashback pending, confirmed, paid out, and claims.
// ═══════════════════════════════════════════════════════════════════

import { defaultEmailAdapter } from "./emailAdapter";
import { formatMoney } from "@/lib/money";

export async function sendCashbackPendingEmail(
  email: string,
  storeName: string,
  cashbackMinor: number,
  currency: string = "USD"
) {
  const formattedAmount = formatMoney({ amountMinor: cashbackMinor, currency });
  const html = `
    <div style="font-family:sans-serif; padding:20px; color:#333;">
      <h2>New Pending Cashback Recorded</h2>
      <p>We tracked your purchase at <strong>${storeName}</strong>!</p>
      <p>Estimated Cashback: <strong style="color:#10b981;">+${formattedAmount}</strong></p>
      <p>Status: <em>Pending Merchant Confirmation</em></p>
    </div>
  `;
  return defaultEmailAdapter.sendEmail({
    to: email,
    subject: `Pending Cashback: +${formattedAmount} at ${storeName}`,
    html,
  });
}

export async function sendCashbackConfirmedEmail(
  email: string,
  storeName: string,
  cashbackMinor: number,
  currency: string = "USD"
) {
  const formattedAmount = formatMoney({ amountMinor: cashbackMinor, currency });
  const html = `
    <div style="font-family:sans-serif; padding:20px; color:#333;">
      <h2>Cashback Confirmed & Ready to Withdraw</h2>
      <p>Great news! Your purchase at <strong>${storeName}</strong> has been confirmed.</p>
      <p>Amount Added to Balance: <strong style="color:#10b981;">+${formattedAmount}</strong></p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://couponpilot.com"}/wallet" style="padding:10px 18px; background:#10b981; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Withdraw Earnings →</a></p>
    </div>
  `;
  return defaultEmailAdapter.sendEmail({
    to: email,
    subject: `Cashback Confirmed: +${formattedAmount} at ${storeName}`,
    html,
  });
}

export async function sendWithdrawalPaidEmail(
  email: string,
  amountMinor: number,
  payoutMethod: string,
  currency: string = "USD"
) {
  const formattedAmount = formatMoney({ amountMinor, currency });
  const html = `
    <div style="font-family:sans-serif; padding:20px; color:#333;">
      <h2>Withdrawal Processed</h2>
      <p>Your withdrawal request of <strong>${formattedAmount}</strong> via <strong>${payoutMethod.toUpperCase()}</strong> has been paid out successfully.</p>
      <p>Thank you for using CouponPilot!</p>
    </div>
  `;
  return defaultEmailAdapter.sendEmail({
    to: email,
    subject: `Payout Sent: ${formattedAmount} via ${payoutMethod.toUpperCase()}`,
    html,
  });
}
