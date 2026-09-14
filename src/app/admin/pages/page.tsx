// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Content & Legal Pages Manager
// Route: /admin/pages
// Clean token design system, dynamic database loading, and live saving.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { toast } from "@/components/Toast";

export default function AdminPagesPage() {
  const [activeTab, setActiveTab] = useState<"about" | "contact" | "privacy" | "terms" | "messages">("about");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Pages state
  const [pages, setPages] = useState<Record<string, any>>({
    about: { title: "", subtitle: "", content: "", metaTitle: "", metaDescription: "" },
    contact: { title: "", subtitle: "", content: "", email: "", phone: "", address: "", metaTitle: "", metaDescription: "" },
    privacy: { title: "", subtitle: "", content: "", metaTitle: "", metaDescription: "" },
    terms: { title: "", subtitle: "", content: "", metaTitle: "", metaDescription: "" },
  });

  // Contact messages state
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages");
      const data = await res.json();
      if (data.pages) {
        setPages(data.pages);
      }
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load page settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (pageKey: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageKey,
          data: pages[pageKey],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedKey(pageKey);
        toast.success(`Page content updated successfully.`);
        setTimeout(() => setSavedKey(null), 2500);
      } else {
        toast.error(data.error || "Failed to save page");
      }
    } catch (err) {
      toast.error("Network error while saving page");
    } finally {
      setSaving(false);
    }
  };

  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_message",
          messageId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setDeleteMessageId(null);
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const updatePageField = (pageKey: string, field: string, value: string) => {
    setPages((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        [field]: value,
      },
    }));
  };

  const tabs = [
    { id: "about", label: "About page" },
    { id: "contact", label: "Contact page" },
    { id: "privacy", label: "Privacy policy" },
    { id: "terms", label: "Terms of service" },
    { id: "messages", label: `Contact messages (${messages.length})` },
  ];

  return (
    <>
      <AdminHeader
        title="Pages & Content"
        breadcrumbs={[{ label: "Catalog", href: "/admin/pages" }, { label: "Pages" }]}
        primaryAction={
          activeTab !== "messages"
            ? {
                label: savedKey === activeTab ? "Saved" : saving ? "Saving..." : "Save changes",
                onClick: () => handleSave(activeTab),
              }
            : undefined
        }
      />

      <main className="p-6 space-y-6 max-w-5xl mx-auto w-full font-body text-ink">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-rule pb-2 overflow-x-auto text-[13px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-[3px] font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink hover:bg-paper-sunken"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px]">
            Loading page contents from database...
          </div>
        ) : activeTab === "messages" ? (
          <div className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-[16px] text-ink">User Contact Submissions</h2>
                <p className="text-[12px] text-muted">
                  Inquiries submitted by shoppers via the public contact page.
                </p>
              </div>
              <span className="text-[12px] font-mono font-medium px-2.5 py-1 bg-paper-sunken border border-rule rounded text-ink">
                Total: {messages.length}
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px]">
                No contact form messages submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-rule rounded">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-paper-sunken border-b border-rule font-medium text-muted text-[12px]">
                      <th className="p-3">Date</th>
                      <th className="p-3">Sender</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Message</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {messages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-paper-sunken/50 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-muted whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-ink">{msg.name}</div>
                          <a href={`mailto:${msg.email}`} className="text-[11px] text-muted hover:underline">
                            {msg.email}
                          </a>
                        </td>
                        <td className="p-3 font-medium text-ink max-w-[150px] truncate">
                          {msg.subject}
                        </td>
                        <td className="p-3 text-muted max-w-sm">
                          <p className="line-clamp-2 text-[12px] whitespace-pre-wrap">{msg.message}</p>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setDeleteMessageId(msg.id)}
                            className="text-urgent hover:underline text-[12px] font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(activeTab);
            }}
            className="bg-paper-raised border border-rule rounded-[4px] p-6 space-y-5 max-w-3xl"
          >
            <div className="border-b border-rule pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-[16px] text-ink capitalize">
                  Edit {activeTab} Page
                </h2>
                <p className="text-[12px] text-muted">
                  Path: <code className="font-mono text-ink">/{activeTab}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`/${activeTab}`, "_blank")}
                className="px-2.5 py-1 text-[12px] bg-paper-sunken border border-rule text-ink rounded hover:bg-paper"
              >
                View live page ↗
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block font-medium text-[13px] text-ink mb-1">Page Title</label>
              <input
                type="text"
                value={pages[activeTab]?.title || ""}
                onChange={(e) => updatePageField(activeTab, "title", e.target.value)}
                placeholder="e.g. About CouponPilot"
                className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink text-[14px]"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block font-medium text-[13px] text-ink mb-1">Page Subtitle / Tagline</label>
              <input
                type="text"
                value={pages[activeTab]?.subtitle || ""}
                onChange={(e) => updatePageField(activeTab, "subtitle", e.target.value)}
                placeholder="Brief header lead text..."
                className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink text-[14px]"
              />
            </div>

            {/* Specific Fields for Contact Page */}
            {activeTab === "contact" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-rule">
                <div>
                  <label className="block font-medium text-[12px] text-ink mb-1">Support Email</label>
                  <input
                    type="email"
                    value={pages.contact?.email || ""}
                    onChange={(e) => updatePageField("contact", "email", e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-2.5 py-1.5 text-[13px] text-ink"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[12px] text-ink mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={pages.contact?.phone || ""}
                    onChange={(e) => updatePageField("contact", "phone", e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-2.5 py-1.5 text-[13px] text-ink font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[12px] text-ink mb-1">Office Address</label>
                  <input
                    type="text"
                    value={pages.contact?.address || ""}
                    onChange={(e) => updatePageField("contact", "address", e.target.value)}
                    className="w-full bg-paper-sunken border border-rule rounded px-2.5 py-1.5 text-[13px] text-ink"
                  />
                </div>
              </div>
            )}

            {/* Page Content Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-[13px] text-ink">Page Body Content</label>
                <span className="text-[11px] font-mono text-muted">Supports Markdown & HTML sectioning</span>
              </div>
              <textarea
                rows={12}
                value={pages[activeTab]?.content || ""}
                onChange={(e) => updatePageField(activeTab, "content", e.target.value)}
                placeholder="Write page content in plain text or Markdown format..."
                className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono text-[13px] leading-relaxed"
              />
            </div>

            {/* SEO Metadata */}
            <div className="pt-3 border-t border-rule space-y-3">
              <h3 className="font-semibold text-[14px] text-ink">Search Engine Optimization (SEO)</h3>

              <div>
                <label className="block font-medium text-[12px] text-ink mb-1">Meta Title</label>
                <input
                  type="text"
                  value={pages[activeTab]?.metaTitle || ""}
                  onChange={(e) => updatePageField(activeTab, "metaTitle", e.target.value)}
                  placeholder="e.g. About Us - CouponPilot"
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-1.5 text-[13px] text-ink"
                />
              </div>

              <div>
                <label className="block font-medium text-[12px] text-ink mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  value={pages[activeTab]?.metaDescription || ""}
                  onChange={(e) => updatePageField(activeTab, "metaDescription", e.target.value)}
                  placeholder="Brief 1-2 sentence description for search engines..."
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-1.5 text-[13px] text-ink"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-ink text-paper font-medium text-[13px] rounded hover:bg-ink/90 transition-colors"
              >
                {saving ? "Saving changes..." : "Save page settings"}
              </button>
              {savedKey === activeTab && (
                <span className="text-money text-[13px] font-medium animate-fade-in">
                  Saved successfully
                </span>
              )}
            </div>
          </form>
        )}

        <ConfirmModal
          isOpen={!!deleteMessageId}
          title="Delete Contact Message"
          description="Are you sure you want to delete this contact submission? This action cannot be undone."
          confirmLabel="Delete message"
          onConfirm={() => deleteMessageId && handleDeleteMessage(deleteMessageId)}
          onClose={() => setDeleteMessageId(null)}
        />
      </main>
    </>
  );
}
