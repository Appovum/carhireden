// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Translations / i18n Key-Value Manager
// Route: /admin/i18n
// Dynamic database CRUD, language switcher, inline modal & translation editor.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { toast } from "@/components/Toast";

interface TranslationRow {
  id: string;
  key: string;
  category: string;
  en: string;
  es?: string;
  fr?: string;
  de?: string;
  hi?: string;
}

export default function AdminI18nPage() {
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetLang, setTargetLang] = useState<"es" | "fr" | "de" | "hi">("es");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TranslationRow | null>(null);

  // Form State
  const [formKey, setFormKey] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formEn, setFormEn] = useState("");
  const [formTargetVal, setFormTargetVal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/i18n");
      const data = await res.json();
      if (data.translations) {
        setTranslations(data.translations);
      }
    } catch (err) {
      console.error("Failed to load translations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormKey("");
    setFormCategory("general");
    setFormEn("");
    setFormTargetVal("");
    setIsModalOpen(true);
  };

  const openEditModal = (row: TranslationRow) => {
    setEditingItem(row);
    setFormKey(row.key);
    setFormCategory(row.category || "general");
    setFormEn(row.en);
    setFormTargetVal(row[targetLang] || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey || !formEn) {
      toast.warning("Key and English text are required.");
      return;
    }

    setSubmitting(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload: any = {
        id: editingItem?.id,
        key: formKey,
        category: formCategory,
        en: formEn,
        [targetLang]: formTargetVal,
      };

      const res = await fetch("/api/admin/i18n", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTranslations(data.translations);
        setIsModalOpen(false);
        toast.success(editingItem ? "Translation updated." : "Translation key added.");
      } else {
        toast.error(data.message || "Failed to save translation.");
      }
    } catch (err) {
      toast.error("Error saving translation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this translation key?")) return;
    try {
      const res = await fetch(`/api/admin/i18n?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setTranslations(data.translations);
        toast.success("Translation key deleted.");
      }
    } catch (err) {
      toast.error("Failed to delete translation key.");
    }
  };

  const langNames: Record<string, string> = {
    es: "Spanish",
    fr: "French",
    de: "German",
    hi: "Hindi",
  };

  const columns: ColumnDef<TranslationRow>[] = [
    {
      key: "key",
      header: "Translation key",
      sortable: true,
      render: (r) => (
        <div>
          <code className="font-mono text-[12px] font-semibold text-ink">{r.key}</code>
          <div className="text-[10px] text-muted uppercase font-mono mt-0.5">{r.category || "general"}</div>
        </div>
      ),
    },
    { key: "en", header: "English (Default)", sortable: true },
    {
      key: targetLang,
      header: `${langNames[targetLang]} value`,
      sortable: true,
      render: (r) => {
        const val = r[targetLang];
        const isMissing = !val || val.trim() === "";
        return isMissing ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-urgent/10 border border-urgent/20 text-urgent">
            Missing translation
          </span>
        ) : (
          <span className="text-ink font-medium">{val}</span>
        );
      },
    },
    {
      key: "actions" as any,
      header: "Actions",
      render: (r) => (
        <div className="flex items-center justify-end gap-2 text-[12px]">
          <button
            onClick={() => openEditModal(r)}
            className="px-2.5 py-1 bg-paper-sunken border border-rule text-ink font-medium rounded hover:bg-paper-raised transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="px-2.5 py-1 bg-urgent/10 border border-urgent/20 text-urgent font-medium rounded hover:bg-urgent/20 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Translations"
        breadcrumbs={[{ label: "System", href: "/admin/settings" }, { label: "Translations" }]}
        primaryAction={{ label: "Add key", onClick: openAddModal }}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Feature Status & Progress Banner */}
        <div className="p-4 bg-paper-sunken border border-rule rounded-[4px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="px-2.5 py-1 rounded text-[11px] font-mono uppercase font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 whitespace-nowrap mt-0.5">
              In Progress
            </span>
            <div>
              <h3 className="font-display font-bold text-[14px] text-ink">
                Full Website Multi-Language Translation
              </h3>
              <p className="text-[12px] text-muted leading-relaxed mt-0.5">
                The global translation system is currently under active development. Whole website localization across all storefront pages, store directories, and customer portals will be fully released in the next update. You can pre-configure translation keys and string dictionaries below.
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 text-[11px] font-mono text-muted border border-rule rounded bg-paper-raised whitespace-nowrap self-start md:self-auto">
            Status: <span className="font-semibold text-ink">Next Update Release</span>
          </div>
        </div>

        {/* Controls Bar: Target Language Switcher & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-paper-raised border border-rule rounded-[4px]">
          <div>
            <h2 className="font-display font-bold text-[16px] text-ink">Locale & Language Strings</h2>
            <p className="text-[12px] text-muted mt-0.5">
              Manage dynamic UI strings across all supported international markets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-muted uppercase font-mono">Target Locale:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as any)}
              className="bg-paper-sunken border border-rule rounded px-3 py-1.5 text-[13px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
            >
              <option value="es">Spanish (ES)</option>
              <option value="fr">French (FR)</option>
              <option value="de">German (DE)</option>
              <option value="hi">Hindi (HI)</option>
            </select>
          </div>
        </div>

        {/* Translation Table */}
        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-[13px] bg-paper-raised border border-rule rounded">
            Loading translation catalog from database...
          </div>
        ) : (
          <AdminTable
            columns={columns}
            data={translations}
            searchPlaceholder="Search translation keys or text..."
            searchField={(r) => `${r.key} ${r.category} ${r.en} ${r.es || ""} ${r.fr || ""} ${r.de || ""} ${r.hi || ""}`}
            exportFilename="translations_export.csv"
            pageSize={10}
          />
        )}

        {/* Add / Edit Key Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
            <div className="bg-paper-raised border border-rule rounded-[6px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
                <h3 className="font-display font-bold text-[16px] text-ink">
                  {editingItem ? "Edit Translation Key" : "Add New Translation Key"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted hover:text-ink text-[16px] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 text-[13px]">
                <div>
                  <label className="block font-medium text-ink mb-1">Translation Key</label>
                  <input
                    type="text"
                    required
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="e.g. header.search_placeholder"
                    disabled={Boolean(editingItem)}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono font-medium disabled:opacity-60"
                  />
                  <p className="text-[11px] text-muted mt-1">Unique dot-notated string key (e.g. section.element_name).</p>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Category / Namespace</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="header, wallet, store, checkout"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">English (Default)</label>
                  <textarea
                    required
                    rows={2}
                    value={formEn}
                    onChange={(e) => setFormEn(e.target.value)}
                    placeholder="English text value..."
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-body"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">
                    {langNames[targetLang]} Translation
                  </label>
                  <textarea
                    rows={2}
                    value={formTargetVal}
                    onChange={(e) => setFormTargetVal(e.target.value)}
                    placeholder={`Enter ${langNames[targetLang]} text value...`}
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-body"
                  />
                </div>

                <div className="pt-3 border-t border-rule flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-paper-sunken border border-rule text-ink font-medium rounded hover:bg-paper-raised transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-ink text-paper font-medium rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Saving..." : editingItem ? "Update Key" : "Create Key"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
