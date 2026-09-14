// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin SMTP Test Email API Route
// Route: POST /api/admin/settings/test-email
// Sends a live test email via Nodemailer using active or draft SMTP settings.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ success: false, message: "Please provide a valid recipient email address." }, { status: 400 });
    }

    // Load from DB if not passed explicitly
    let host = smtpHost;
    let port = smtpPort;
    let user = smtpUser;
    let pass = smtpPass;
    let from = smtpFrom;
    let secure = smtpSecure;

    if (!host || !user || !pass) {
      const dbSettings = await db.setting.findMany({
        where: {
          key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] },
        },
      });

      dbSettings.forEach((s) => {
        let val = s.valueJson;
        try { val = JSON.parse(s.valueJson); } catch {}
        if (s.key === "smtp_host" && !host) host = val;
        if (s.key === "smtp_port" && !port) port = val;
        if (s.key === "smtp_user" && !user) user = val;
        if (s.key === "smtp_pass" && !pass) pass = val;
        if (s.key === "smtp_from" && !from) from = val;
        if (s.key === "smtp_secure" && secure === undefined) secure = val;
      });
    }

    // Fallback to process.env if available
    host = host || process.env.SMTP_HOST || "smtp.gmail.com";
    port = port || process.env.SMTP_PORT || "465";
    user = user || process.env.SMTP_USER;
    pass = pass || process.env.SMTP_PASS;
    from = from || process.env.SMTP_FROM || `CouponPilot <${user || "support@couponpilot.com"}>`;

    if (!user || !pass) {
      return NextResponse.json({
        success: false,
        message: "SMTP User and Password are required. Please fill in credentials before sending a test email.",
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(String(port), 10),
      secure: String(secure) !== "false",
      auth: {
        user,
        pass: String(pass).replace(/\s+/g, ""),
      },
    });

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: "CouponPilot SMTP Configuration Test",
      text: `Hello!\n\nThis is a test email sent from your CouponPilot Admin Panel.\nYour SMTP settings (Host: ${host}:${port}) are working perfectly!\n\nSent at: ${new Date().toLocaleString()}\nCouponPilot System`,
      html: `<div style="font-family: sans-serif; padding: 24px; border: 1px solid #e5e7eb; border-radius: 6px; max-width: 500px; background: #ffffff;">
        <h2 style="color: #10B981; margin-top: 0;">SMTP Test Successful</h2>
        <p style="color: #374151; font-size: 14px;">Your transactional email settings are configured correctly on CouponPilot.</p>
        <div style="background: #F3F4F6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #1F2937;">
          <strong>Host:</strong> ${host}:${port}<br/>
          <strong>User:</strong> ${user}<br/>
          <strong>Status:</strong> Connected & Verified
        </div>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">Sent automatically by CouponPilot Admin Panel.</p>
      </div>`,
    });

    return NextResponse.json({
      success: true,
      message: `Test email successfully delivered to ${recipientEmail}!`,
    });
  } catch (error: any) {
    console.error("Test email failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to send test email. Check host, port, and password.",
      },
      { status: 500 }
    );
  }
}
