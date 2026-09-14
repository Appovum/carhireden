// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Users & Wallets Manager (Full CRUD)
// Route: /admin/users
// Real dynamic database fetching, full CRUD (Create, Edit, Delete, Balance Adjustments).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef, BulkAction } from "@/components/admin/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useSiteSettings } from "@/hooks";
import { formatMoney } from "@/lib/money";
import { toast } from "@/components/Toast";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  referralCode?: string | null;
  pendingMinor: number;
  confirmedMinor: number;
  paidMinor: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");

  // Adjustment Modal State
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("10.00");
  const [adjustReason, setAdjustReason] = useState("");

  // Delete Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setEmail("");
    setName("");
    setRole("user");
    setPassword("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: UserRow) => {
    setEditingUser(u);
    setEmail(u.email);
    setName(u.name);
    setRole(u.role);
    setPassword("");
    setIsAddModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.warning("Email is required.");
      return;
    }
    setSubmitting(true);

    try {
      const endpoint = "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";
      const body: any = {
        id: editingUser?.id,
        email,
        name,
        role,
      };
      if (password) body.password = password;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        toast.success(editingUser ? "User updated successfully." : "User created successfully.");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to save user.");
      }
    } catch {
      toast.error("Network error saving user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser || !adjustReason) return;
    setSubmitting(true);
    try {
      const amountMinor = Math.round(parseFloat(adjustAmount) * 100);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          userId: adjustingUser.id,
          amountMinor,
          bucket: "confirmed",
          description: adjustReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAdjustingUser(null);
        setAdjustReason("");
        toast.success("Wallet balance adjusted successfully.");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to adjust balance");
      }
    } catch {
      toast.error("Error submitting adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (u: UserRow) => {
    setConfirmState({
      isOpen: true,
      title: `Delete User "${u.email}"`,
      description: `Are you sure you want to permanently delete user account ${u.email}? All associated balance logs and claims for this user will be removed.`,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(`User "${u.email}" deleted.`);
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchUsers();
          } else {
            toast.error(data.error || "Failed to delete user.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }
        } catch {
          toast.error("Error deleting user.");
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleBulkDelete = (selected: UserRow[]) => {
    setConfirmState({
      isOpen: true,
      title: `Delete ${selected.length} User${selected.length > 1 ? "s" : ""}`,
      description: `Are you sure you want to permanently delete ${selected.length} selected user account(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const ids = selected.map((u) => u.id);
          const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action: "delete" }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success("Selected user(s) deleted permanently.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchUsers();
          } else {
            toast.error(data.error || "Failed to delete selected users.");
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }
        } catch {
          toast.error("Error deleting selected users.");
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleBulkRoleChange = async (selected: UserRow[], targetRole: "admin" | "user") => {
    try {
      const ids = selected.map((u) => u.id);
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: targetRole === "admin" ? "make_admin" : "make_user" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Selected user(s) updated to ${targetRole}.`);
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to update user roles.");
      }
    } catch {
      toast.error("Error updating user roles.");
    }
  };

  const bulkActions: BulkAction<UserRow>[] = [
    { label: "Promote to Admin", onClick: (selected) => handleBulkRoleChange(selected, "admin") },
    { label: "Demote to Shopper", onClick: (selected) => handleBulkRoleChange(selected, "user") },
    { label: "Delete selected users", onClick: handleBulkDelete, isDestructive: true },
  ];

  const columns: ColumnDef<UserRow>[] = [
    {
      key: "email",
      header: "Shopper / Email",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.name}</div>
          <div className="text-[11px] text-muted font-mono">{r.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${
            r.role === "admin" ? "bg-ink text-paper border-ink" : "bg-paper-sunken border-rule text-muted"
          }`}
        >
          {r.role}
        </span>
      ),
    },
    {
      key: "pendingMinor",
      header: "Pending bucket",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.pendingMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "confirmedMinor",
      header: "Confirmed bucket",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.confirmedMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
    {
      key: "paidMinor",
      header: "Paid payouts",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.paidMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAdjustingUser(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            Adjust balance
          </button>
          <button
            onClick={() => openEditModal(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteUser(r)}
            className="px-2 py-1 bg-paper-sunken border border-rule text-urgent text-[11px] font-medium rounded hover:bg-paper-raised transition-colors"
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
        title="Users & wallets"
        breadcrumbs={[{ label: "Money", href: "/admin/users" }, { label: "Users & wallets" }]}
        primaryAction={{ label: "Add user", onClick: openAddModal }}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={users}
          loading={loading}
          searchPlaceholder="Search users by email or name..."
          searchField={(r) => `${r.email} ${r.name}`}
          bulkActions={bulkActions}
          exportFilename="users_ledger_export.csv"
          pageSize={10}
        />
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete user"
        loading={submitting}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Add / Edit User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 font-body">
          <div className="bg-paper-raised border border-rule rounded-[4px] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-display font-semibold text-[16px]">
                {editingUser ? `Edit User — ${editingUser.email}` : "Add new user account"}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-[13px]">
              <div>
                <label className="block text-ink font-medium mb-1">
                  Email Address <span className="text-urgent">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">User Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink"
                >
                  <option value="user">Shopper (Standard User)</option>
                  <option value="admin">Administrator (Full Admin Rights)</option>
                </select>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">
                  {editingUser ? "New Password (Leave blank to keep unchanged)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-mono"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-rule bg-paper-sunken text-ink text-[12px] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-ink text-paper text-[12px] font-medium rounded hover:bg-ink/90 transition-colors"
                >
                  {submitting ? "Saving..." : editingUser ? "Update user" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule rounded-[4px] shadow-2xl p-6 max-w-md w-full space-y-4 font-body">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-display font-semibold text-[16px]">Manual ledger adjustment</h3>
              <button onClick={() => setAdjustingUser(null)} className="text-muted hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-[14px]">
              <div>
                <label className="block text-muted text-[12px]">Target user</label>
                <div className="font-medium text-ink">{adjustingUser.email}</div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Adjustment amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink font-code"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Required reason (Logged to audit)</label>
                <textarea
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Manual customer support bonus resolution"
                  className="w-full bg-paper-sunken border border-rule rounded px-3 py-2 text-ink h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[13px] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded hover:bg-ink/90 transition-colors"
                >
                  {submitting ? "Saving..." : "Confirm adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
