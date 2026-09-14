// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Public API: Contact Form Submission Handler
// Route: POST /api/contact
// Stores submissions in db.setting (contact_messages) and audit log.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required fields." },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: (subject || "General Inquiry").trim(),
      message: message.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };

    // Load existing messages
    const dbSetting = await db.setting.findUnique({ where: { key: "contact_messages" } });
    let messages: any[] = dbSetting ? JSON.parse(dbSetting.valueJson) : [];

    // Prepend new message
    messages.unshift(newMessage);

    // Keep max 200 messages
    if (messages.length > 200) {
      messages = messages.slice(0, 200);
    }

    await db.setting.upsert({
      where: { key: "contact_messages" },
      update: { valueJson: JSON.stringify(messages), category: "contact" },
      create: { key: "contact_messages", valueJson: JSON.stringify(messages), category: "contact" },
    });

    // Record audit log entry
    try {
      await db.auditLog.create({
        data: {
          action: "CONTACT_SUBMISSION",
          resource: "contact_form",
          resourceId: newMessage.id,
          detailsJson: JSON.stringify({ email: newMessage.email, subject: newMessage.subject }),
        },
      });
    } catch {
      // Ignore if audit log is unconfigured
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your message has been received and our team will get back to you soon.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit contact form." },
      { status: 500 }
    );
  }
}
