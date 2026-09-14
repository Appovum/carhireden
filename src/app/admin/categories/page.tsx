// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Categories Manager
// Route: /admin/categories
// Real dynamic database fetching, line icons & API mutations.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { toast } from "@/components/Toast";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  storeCount: number;
}

function CategoryIconRenderer({ icon }: { icon: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Category Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setName("");
        setSlug("");
        toast.success("Category created successfully.");
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to create category");
      }
    } catch (err) {
      toast.error("Error creating category");
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteId(null);
        toast.success("Category deleted.");
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to delete category.");
      }
    } catch (err) {
      toast.error("Error deleting category.");
    }
  };

  const columns: ColumnDef<CategoryRow>[] = [
    {
      key: "reorder",
      header: "",
      sortable: false,
      render: () => (
        <span className="cursor-grab text-muted hover:text-ink select-none">
          ⋮⋮
        </span>
      ),
    },
    {
      key: "icon",
      header: "Icon",
      sortable: false,
      render: (r) => <CategoryIconRenderer icon={r.icon} />,
    },
    { key: "name", header: "Category name", sortable: true },
    { key: "slug", header: "Slug", sortable: true },
    { key: "storeCount", header: "Mapped stores", isNumeric: true, sortable: true },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDeleteId(r.id)}
            className="px-2.5 py-1 bg-paper-sunken border border-rule text-urgent text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
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
        title="Categories"
        breadcrumbs={[{ label: "Catalog", href: "/admin/categories" }, { label: "Categories" }]}
        primaryAction={{ label: "Add category", onClick: () => setIsModalOpen(true) }}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={categories}
          loading={loading}
          searchPlaceholder="Search categories..."
          searchField={(r) => `${r.name} ${r.slug}`}
          exportFilename="categories_export.csv"
          pageSize={10}
        />

        <ConfirmModal
          isOpen={!!deleteId}
          title="Delete Category"
          description="Are you sure you want to delete this category? This action cannot be undone."
          confirmLabel="Delete category"
          onConfirm={() => deleteId && handleDelete(deleteId)}
          onClose={() => setDeleteId(null)}
        />

        {/* Add Category Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-md w-full space-y-4 font-body">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display font-semibold text-[16px]">Add new category</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-[13px]">
                <div>
                  <label className="block text-ink font-medium mb-1">Category name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fashion & Apparel"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">URL slug (Optional)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. fashion"
                    className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[12px] rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90 transition-colors"
                  >
                    {submitting ? "Saving..." : "Create category"}
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
