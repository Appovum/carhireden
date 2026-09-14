// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Contact Form Client Component
// Handles user interaction, input validation, and submission to /api/contact
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";

interface ContactFormProps {
  initialNote?: string;
}

export function ContactForm({ initialNote }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ type: "error", text: "Please fill out all required fields (Name, Email, Message)." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({ type: "success", text: data.message || "Message sent successfully!" });
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setStatus({ type: "error", text: data.error || "Failed to submit message. Please try again." });
      }
    } catch (err) {
      setStatus({ type: "error", text: "An unexpected error occurred. Please check your network." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-body">
      <div>
        <h2 className="font-display font-bold text-[18px] text-ink">Send Us a Message</h2>
        {initialNote && <p className="text-[13px] text-muted mt-0.5">{initialNote}</p>}
      </div>

      {status && (
        <div
          className={`p-3 rounded border text-[13px] font-medium ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-urgent/10 border-urgent/30 text-urgent"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-ink mb-1">
            Your Name <span className="text-urgent">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-ink mb-1">
            Email Address <span className="text-urgent">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ink mb-1">Subject</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring"
        >
          <option value="">Select a topic...</option>
          <option value="Missing Cashback Inquiry">Missing Cashback Inquiry</option>
          <option value="Coupon / Promo Code Issue">Coupon / Promo Code Issue</option>
          <option value="Merchant Partnership / Advertising">Merchant Partnership / Advertising</option>
          <option value="Account & Payout Support">Account & Payout Support</option>
          <option value="General Feedback">General Feedback</option>
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ink mb-1">
          Message <span className="text-urgent">*</span>
        </label>
        <textarea
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question or issue in detail..."
          className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-[14px] text-ink leading-relaxed focus:outline-none focus:ring-2 focus:ring-focus-ring"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-2.5 bg-ink text-paper font-medium text-[14px] rounded hover:bg-ink/90 transition-colors disabled:opacity-50"
      >
        {submitting ? "Sending message..." : "Send Message"}
      </button>
    </form>
  );
}
