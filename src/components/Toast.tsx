// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Monochromatic Brand Token Toast Component & System
// Strict adherence to CouponPilot Black & White / Ink & Paper aesthetic.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "demo";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

// Global Event Listener System for non-React contexts
type ToastListener = (toast: Omit<ToastMessage, "id"> & { id?: string }) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  show: (toastMessage: Omit<ToastMessage, "id"> & { id?: string }) => {
    listeners.forEach((listener) => listener(toastMessage));
  },
  success: (message: string, title: string = "SUCCESS") => {
    toast.show({ type: "success", title, message });
  },
  error: (message: string, title: string = "ERROR") => {
    // If message starts with "Demo Mode", default title to "DEMO MODE"
    const isDemo = message.toLowerCase().includes("demo mode");
    toast.show({
      type: isDemo ? "demo" : "error",
      title: isDemo ? "DEMO MODE" : title,
      message,
    });
  },
  warning: (message: string, title: string = "WARNING") => {
    toast.show({ type: "warning", title, message });
  },
  info: (message: string, title: string = "NOTICE") => {
    toast.show({ type: "info", title, message });
  },
  demo: (message: string = "Modifications are disabled in public live preview mode.") => {
    toast.show({
      type: "demo",
      title: "DEMO MODE ACTIVE",
      message,
      duration: 5000,
    });
  },
};

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to global dispatch if used outside provider
    return {
      toast,
      addToast: toast.show,
      removeToast: () => {},
      toasts: [],
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((newToast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastMessage = { ...newToast, id };
    setToasts((prev) => [item, ...prev].slice(0, 5)); // Keep max 5 toasts
  }, []);

  useEffect(() => {
    const handleGlobalToast = (data: Omit<ToastMessage, "id"> & { id?: string }) => {
      addToast(data);
    };
    listeners.add(handleGlobalToast);
    return () => {
      listeners.delete(handleGlobalToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration || 4500;
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  // Icon mapping according to monochrome brand tokens
  const renderIcon = () => {
    switch (toast.type) {
      case "demo":
        return (
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "success":
        return (
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getBadgeText = () => {
    if (toast.title) return toast.title;
    switch (toast.type) {
      case "demo":
        return "DEMO MODE";
      case "success":
        return "SUCCESS";
      case "error":
        return "ERROR";
      case "warning":
        return "WARNING";
      default:
        return "NOTICE";
    }
  };

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden bg-[#18181C] text-[#F7F5F0] border border-[#3E3E45] rounded-[6px] p-4 shadow-2xl transition-all duration-200 ease-out font-body ${
        isExiting
          ? "opacity-0 translate-y-[-8px] scale-95"
          : "animate-[toast-slide-in_200ms_cubic-bezier(0.16,1,0.3,1)]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Monochromatic icon badge container */}
        <div className="w-6 h-6 rounded bg-black/40 border border-[#4B4B54] flex items-center justify-center shrink-0 mt-0.5">
          {renderIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#E8E6E1] text-[#141418] text-[10px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px]">
              {getBadgeText()}
            </span>
          </div>
          <p className="text-[13px] text-[#D8D5CE] leading-snug break-words">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="text-[#8A8880] hover:text-[#FFFFFF] transition-colors p-1 rounded hover:bg-white/10 shrink-0 text-sm leading-none"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>

      {/* Auto-dismiss progress bar (Monochromatic) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        <div
          className="h-full bg-white/70"
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
