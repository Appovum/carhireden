import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export interface EmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`[TRANSACTIONAL EMAIL DISPATCH] to: ${payload.to}`);
  console.log(`SUBJECT: ${payload.subject}`);
  console.log("═══════════════════════════════════════════════════════════════");

  let smtpUser = process.env.SMTP_USER;
  let smtpPass = process.env.SMTP_PASS;
  let smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  let smtpPort = process.env.SMTP_PORT || "465";
  let smtpFrom = process.env.SMTP_FROM;
  let smtpSecure = process.env.SMTP_SECURE !== "false";

  try {
    const dbSettings = await db.setting.findMany({
      where: {
        key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] },
      },
    });

    dbSettings.forEach((s) => {
      let val = s.valueJson;
      try { val = JSON.parse(s.valueJson); } catch {}
      if (s.key === "smtp_host" && val) smtpHost = val;
      if (s.key === "smtp_port" && val) smtpPort = String(val);
      if (s.key === "smtp_user" && val) smtpUser = val;
      if (s.key === "smtp_pass" && val) smtpPass = val;
      if (s.key === "smtp_from" && val) smtpFrom = val;
      if (s.key === "smtp_secure" && val !== undefined) smtpSecure = Boolean(val);
    });
  } catch (err) {
    // Fall back cleanly to process.env
  }

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""), // normalize app password
        },
      });

      const from = smtpFrom || `CouponPilot <${smtpUser}>`;

      await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.bodyText,
        html: payload.bodyHtml,
      });

      console.log(`[SMTP SUCCESS] Email successfully sent to ${payload.to}`);
      return true;
    } catch (error) {
      console.error("[SMTP ERROR] Failed to send email via SMTP:", error);
      return false;
    }
  }

  return true;
}

export async function sendPaymentReceivedEmail(params: {
  to: string;
  brandName: string;
  orderId: string;
  magicToken: string;
  amountUsd: string;
  placementKind: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/advertiser?token=${params.magicToken}`;

  const subject = `Payment Confirmed: Order #${params.orderId} for ${params.brandName}`;
  const bodyText = `Hi ${params.brandName},\n\nWe received your payment of $${params.amountUsd} for placement order #${params.orderId}.\n\nNote: Your purchased campaign duration starts from the exact moment of Admin Approval & Activation.\n\nAccess your Advertiser Portal to view status, upload artwork & download tax receipts:\n${portalUrl}\n\nThank you,\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">
    <h2>Payment Confirmed!</h2>
    <p>Hi <strong>${params.brandName}</strong>,</p>
    <p>We received your payment of <strong>$${params.amountUsd}</strong> for order <code>#${params.orderId}</code>.</p>
    <p style="font-size: 13px; color: #4B5563;">Note: Your purchased campaign duration starts from the exact moment of Admin Approval & Activation.</p>
    <p><a href="${portalUrl}" style="background: #111827; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Advertiser Portal</a></p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

export async function sendCreativeRequiredEmail(params: {
  to: string;
  brandName: string;
  orderId: string;
  magicToken: string;
  requiredDimensions: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/advertiser?token=${params.magicToken}`;

  const subject = `Action Required: Upload Banner Artwork for Order #${params.orderId}`;
  const bodyText = `Hi ${params.brandName},\n\nYour payment for order #${params.orderId} is confirmed. Please upload your banner artwork (${params.requiredDimensions} pixels):\n\nUpload Artwork here:\n${portalUrl}\n\nThank you,\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">
    <h2>Upload Artwork Required</h2>
    <p>Hi <strong>${params.brandName}</strong>,</p>
    <p>Please upload your banner artwork (Required dimensions: <strong>${params.requiredDimensions}</strong> pixels) to activate your campaign.</p>
    <p><a href="${portalUrl}" style="background: #10B981; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Upload Banner Artwork</a></p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

export async function sendCampaignApprovedEmail(params: {
  to: string;
  brandName: string;
  orderId: string;
  startsAt: string;
  endsAt: string;
}) {
  const subject = `Campaign Approved: Order #${params.orderId} is Scheduled!`;
  const bodyText = `Hi ${params.brandName},\n\nGreat news! Your placement order #${params.orderId} has been approved by our team.\n\nCampaign Schedule: ${params.startsAt} to ${params.endsAt}.\n\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">
    <h2>Campaign Approved!</h2>
    <p>Hi <strong>${params.brandName}</strong>,</p>
    <p>Your placement order <code>#${params.orderId}</code> has been approved and scheduled.</p>
    <p><strong>Window:</strong> ${params.startsAt} to ${params.endsAt}</p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

export async function sendCampaignLiveEmail(params: {
  to: string;
  brandName: string;
  orderId: string;
}) {
  const subject = `Your Campaign #${params.orderId} is NOW LIVE!`;
  const bodyText = `Hi ${params.brandName},\n\nYour campaign #${params.orderId} is now live on CouponPilot!\n\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">
    <h2 style="color: #10B981;">Your Campaign is LIVE!</h2>
    <p>Hi <strong>${params.brandName}</strong>,</p>
    <p>Your promotion for order <code>#${params.orderId}</code> is now active across CouponPilot.</p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

export async function sendCampaignEndedEmail(params: {
  to: string;
  brandName: string;
  orderId: string;
}) {
  const subject = `Campaign Completed: Order #${params.orderId}`;
  const bodyText = `Hi ${params.brandName},\n\nYour campaign #${params.orderId} has completed. Thank you for advertising with CouponPilot!\n\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">
    <h2>Campaign Completed</h2>
    <p>Hi <strong>${params.brandName}</strong>,</p>
    <p>Your campaign for order <code>#${params.orderId}</code> has ended. Thank you for your partnership!</p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}) {
  const subject = "Reset your CouponPilot password";
  const bodyText = `Hi,\n\nWe received a request to reset your CouponPilot password. Click the link below to set a new password:\n\n${params.resetUrl}\n\nThis link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nThank you,\nCouponPilot Team`;
  const bodyHtml = `<div style="font-family: sans-serif; padding: 24px; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">We received a request to reset the password for your CouponPilot account (<strong>${params.to}</strong>).</p>
    <p style="margin: 24px 0;">
      <a href="${params.resetUrl}" style="background: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 14px; display: inline-block;">Reset Password</a>
    </p>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${params.resetUrl}" style="color: #2563eb; word-break: break-all;">${params.resetUrl}</a></p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">This link will expire in 1 hour. If you didn't ask to reset your password, you can safely ignore this email.</p>
  </div>`;

  return sendEmail({ to: params.to, subject, bodyText, bodyHtml });
}

