// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Reusable Confirmation Modal
// Replaces ugly browser native confirm() dialogs with clean design system modals.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-md w-full space-y-4 font-body shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-rule pb-3">
          <h3 className="font-display font-semibold text-[17px] text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-[16px] leading-none px-1.5 py-0.5 rounded hover:bg-paper-sunken transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-[14px] text-muted leading-relaxed">{description}</p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-rule">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-paper-sunken border border-rule text-ink text-[13px] font-medium rounded hover:bg-paper-raised transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-[13px] font-medium rounded text-white transition-colors flex items-center gap-2 ${
              isDestructive
                ? "bg-urgent hover:bg-urgent/90 cursor-pointer"
                : "bg-ink hover:bg-ink/90 cursor-pointer"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
